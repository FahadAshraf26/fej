import { inject, injectable } from "tsyringe";
import { supabaseServer as supabase } from "@database/server.connection";
import { IPlan } from "interfaces/IPlan";
import { ICouponValidationResult, ICustomerData } from "interfaces/IStripe";
import Stripe from "stripe";
import { stripe } from "@Config/stripe";

import type {
  IRestaurantRepository,
  Restaurant,
} from "@repositories/interfaces/IRestaurantRepository";
import type {
  IBillingRepository,
  SubscriptionData,
} from "@repositories/interfaces/IBillingRepository";
import type { IUserRepository, User } from "@repositories/interfaces/IUserRepository";
import {
  ResourceNotFoundError,
  BillingError,
  CustomerError,
  SubscriptionError,
} from "@utils/errors/DomainErrors";
import { PaymentProviderService } from "./PaymentProviderService";
import { BillingRepository } from "@repositories/implementations/BillingRepository";
import { RestaurantRepository } from "@repositories/implementations/RestaurantRepository";
import { UserRepository } from "@repositories/implementations/UserRepository";
import { PlanService } from "../payment/PlanService";
import { PlanError } from "@errors/PlanError";
import { dispatchErrorEvent } from "@services/eventService";
import { SubscriptionCheckoutLinkService } from "./SubscriptionCheckoutLinkService";
import { getSalesRepSlackId } from "@utils/salesRepMapping";
/**
 * Main billing service that coordinates between payment provider and database operations
 */
@injectable()
export class BillingService {
  constructor(
    @inject(RestaurantRepository) private restaurantRepository: IRestaurantRepository,
    @inject(UserRepository) private userRepository: IUserRepository,
    @inject(BillingRepository) private billingRepository: IBillingRepository,
    @inject(PaymentProviderService) private paymentProvider: PaymentProviderService,
    @inject(PlanService) private planService: PlanService,
    @inject(SubscriptionCheckoutLinkService)
    private subscriptionCheckoutLinkService: SubscriptionCheckoutLinkService
  ) {}

  /**
   * Sets up a subscription payment for a customer
   */
  public async setupSubscription(
    customerData: ICustomerData,
    plan: IPlan,
    couponCode?: string,
    baseUrl?: string
  ): Promise<string> {
    this.validateCustomerData(customerData);
    this.validatePlan(plan);

    const { email, name, restaurantName, phoneNumber, sendInvoices } = customerData;

    // Use the sales rep slack ID that was already mapped in the controller
    const salesRepSlackId = customerData.salesRepSlackId;

    // Update customer data with mapped sales rep slack ID
    const enhancedCustomerData = {
      ...customerData,
      salesRepSlackId: salesRepSlackId,
    };

    // Find or prepare user
    const user = await this.findUserByEmail(email);

    // Ensure we have a valid Stripe customer
    const customerId = await this.ensureValidStripeCustomer(enhancedCustomerData, user);

    // Update invoice preferences if specified
    if (sendInvoices !== undefined) {
      await this.updateInvoicePreferences(enhancedCustomerData, customerId, user);
    }

    // Create checkout session with retry logic
    const originalCheckoutUrl = await this.createCheckoutSessionWithRetry(
      plan,
      { ...enhancedCustomerData, stripeCustomerId: customerId },
      couponCode,
      baseUrl,
      user
    );

    // Ensure user has restaurant_id for link creation
    let finalUser = user;
    if (!finalUser) {
      // Find the user that was created during customer creation
      const { user: foundUser } = await this.userRepository.getByEmail(email);
      finalUser = foundUser;
    }

    if (!finalUser) {
      throw new BillingError("Failed to create or find user for checkout link");
    }

    if (!finalUser.restaurant_id && restaurantName) {
      // Ensure restaurant is created and linked
      await this.handleRestaurantCreation(finalUser, restaurantName, customerId);
      // Refresh user data
      const { user: refreshedUser } = await this.userRepository.getByEmail(email);
      finalUser = refreshedUser;
    }

    if (!finalUser?.restaurant_id) {
      throw new BillingError("User must have a restaurant ID for checkout link creation");
    }

    // Create checkout link using the new service
    const linkId = await this.subscriptionCheckoutLinkService.createCheckoutLink(
      enhancedCustomerData,
      plan,
      customerId,
      originalCheckoutUrl,
      finalUser.id,
      finalUser.restaurant_id,
      baseUrl
    );

    // Return the full checkout link URL
    const checkoutLink = `${baseUrl || process.env.NEXT_PUBLIC_BASE_URL}/subscription/${linkId}`;
    return checkoutLink;
  }

  private async findUserByEmail(email: string): Promise<User | null> {
    try {
      const { user } = await this.userRepository.getByEmail(email);
      return user;
    } catch (error) {
      // User not found by email, will create one later
      return null;
    }
  }

  private async ensureValidStripeCustomer(
    customerData: ICustomerData,
    user: User | null
  ): Promise<string> {
    let customerId = user?.stripe_customer_id;

    if (customerId) {
      const isValidCustomer = await this.validateStripeCustomer(customerId);
      if (!isValidCustomer) {
        customerId = await this.handleNewCustomerCreation(customerData, user);
      }
    } else {
      customerId = await this.handleNewCustomerCreation(customerData, user);
    }

    return customerId;
  }

  private async validateStripeCustomer(customerId: string): Promise<boolean> {
    try {
      const stripeCustomer = (await stripe.customers.retrieve(customerId)) as Stripe.Customer;
      return !stripeCustomer.deleted && !!stripeCustomer.email;
    } catch (error) {
      console.error(`Error validating Stripe customer ${customerId}:`, error);
      return false;
    }
  }

  private async createCheckoutSessionWithRetry(
    plan: IPlan,
    customerDataWithStripeId: ICustomerData & { stripeCustomerId: string },
    couponCode?: string,
    baseUrl?: string,
    user?: User | null
  ): Promise<string> {
    try {
      return await this.createCheckoutSession(plan, customerDataWithStripeId, couponCode, baseUrl);
    } catch (error: any) {
      // Handle specific Stripe customer error with retry
      if (this.isStripeCustomerError(error)) {
        return await this.retryWithNewCustomer(
          plan,
          customerDataWithStripeId,
          couponCode,
          baseUrl,
          user
        );
      }

      dispatchErrorEvent("Failed to initialize subscription", {
        restaurant_id: user?.restaurant_id,
        error_message: error.message,
      });
      throw new BillingError(`Failed to initialize subscription: ${error.message}`);
    }
  }

  private async createCheckoutSession(
    plan: IPlan,
    customerDataWithStripeId: ICustomerData & { stripeCustomerId: string },
    couponCode?: string,
    baseUrl?: string
  ): Promise<string> {
    const checkoutSession = await this.paymentProvider.createSubscriptionCheckoutSession(
      plan,
      customerDataWithStripeId,
      couponCode,
      baseUrl
    );

    if (!checkoutSession?.url) {
      throw new BillingError("Failed to initialize subscription - no checkout URL returned");
    }

    return checkoutSession.url;
  }

  private async retryWithNewCustomer(
    plan: IPlan,
    originalCustomerData: ICustomerData & { stripeCustomerId: string },
    couponCode?: string,
    baseUrl?: string,
    user?: User | null
  ): Promise<string> {
    try {
      const newCustomerId = await this.handleNewCustomerCreation(originalCustomerData, user!);
      const retryCustomerData = {
        ...originalCustomerData,
        stripeCustomerId: newCustomerId,
      };

      return await this.createCheckoutSession(plan, retryCustomerData, couponCode, baseUrl);
    } catch (retryError: any) {
      dispatchErrorEvent("Failed to initialize subscription after customer recreation", {
        restaurant_id: user?.restaurant_id,
        error_message: retryError.message,
      });
      throw new BillingError(
        `Failed to initialize subscription after customer recreation: ${retryError.message}`
      );
    }
  }

  private isStripeCustomerError(error: any): boolean {
    return error.code === "resource_missing" && error.type === "StripeInvalidRequestError";
  }
  private validateCustomerData(customerData: ICustomerData): void {
    if (!customerData.email || !customerData.name) {
      throw new BillingError("Customer email and name are required");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerData.email)) {
      throw new BillingError("Invalid email format");
    }
  }

  private validatePlan(plan: IPlan): void {
    if (!plan || !plan.id) {
      throw new BillingError("Valid plan is required");
    }
  }

  private async handleNewCustomerCreation(
    customerData: ICustomerData,
    existingUser: User | null
  ): Promise<string> {
    try {
      const newCustomer = await this.paymentProvider.findOrCreateCustomer(customerData);

      if (!newCustomer?.id) {
        throw new BillingError("Failed to create Stripe customer: No customer ID returned");
      }

      const customerId = newCustomer.id;

      if (!existingUser) {
        await this.createNewUserWithRestaurant(customerData, customerId);
      } else {
        await this.userRepository.updateUserCustomerId(customerData.email, customerId);
      }

      return customerId;
    } catch (error: any) {
      throw new BillingError(`Failed to create customer: ${error.message}`);
    }
  }

  private async createNewUserWithRestaurant(
    customerData: ICustomerData,
    customerId: string
  ): Promise<User> {
    const { email, name, restaurantName, phoneNumber } = customerData;

    try {
      const newUser = await this.userRepository.create({
        email,
        customer_name: name,
        phone: phoneNumber,
        stripe_customer_id: customerId,
        subscriptionActive: false,
        role: "owner",
      });

      if (restaurantName) {
        await this.handleRestaurantCreation(newUser, restaurantName, customerId);
      } else {
        await this.userRepository.updateStripeCustomerId(newUser.id, customerId);
      }

      return newUser;
    } catch (error: any) {
      throw new BillingError(`Failed to create user: ${error.message}`);
    }
  }

  private async handleRestaurantCreation(
    user: User,
    restaurantName: string,
    customerId: string
  ): Promise<void> {
    try {
      let { restaurant, error: restaurantError } = await this.restaurantRepository.getByOwnerId(
        user.id
      );

      if (restaurantError?.code === "PGRST116" || !restaurant) {
        // Try to find restaurant by name
        const { restaurant: restaurantByName, error: nameError } =
          await this.restaurantRepository.getByName(restaurantName);

        if (!nameError && restaurantByName) {
          restaurant = restaurantByName;
        } else {
          const newRestaurant = await this.restaurantRepository.create({
            name: restaurantName,
            owner_id: user.id,
          });
          restaurant = newRestaurant;
        }
      }

      await this.updateUserWithRestaurantAndStripe(user.id, restaurant.id, customerId);
    } catch (error: any) {
      throw new BillingError(`Failed to handle restaurant: ${error.message}`);
    }
  }

  private async updateUserWithRestaurantAndStripe(
    userId: string,
    restaurantId: string,
    customerId: string
  ): Promise<void> {
    await this.userRepository.updateRestaurantId(userId, restaurantId);
    await this.userRepository.updateStripeCustomerId(userId, customerId);
  }

  private async updateInvoicePreferences(
    customerData: ICustomerData,
    customerId: string,
    user: User | null
  ): Promise<void> {
    try {
      const customer = await this.paymentProvider.findOrCreateCustomer({
        ...customerData,
        stripeCustomerId: customerId,
      });

      if (user?.id && customerData.sendInvoices !== undefined) {
        await supabase
          .from("subscriptions")
          .update({ send_invoices: customerData.sendInvoices })
          .eq("profile_id", user.id);
      }
    } catch (error: any) {
      console.log(
        `[SetupSubscription] ERROR: Failed to update customer invoice preferences: ${error.message}`
      );
    }
  }

  /**
   * Extends the trial period for a subscription
   */
  public async extendTrialPeriod(subscriptionId: string, additionalDays: number) {
    try {
      const { data: subscription, error: subscriptionError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("stripe_subscription_id", subscriptionId)
        .single();

      if (subscriptionError) throw subscriptionError;
      if (!subscription) throw new ResourceNotFoundError("Subscription", subscriptionId);

      const { newTrialEnd } = await this.paymentProvider.extendTrialInStripe(
        subscription.stripe_customer_id,
        subscriptionId,
        additionalDays
      );

      await this.billingRepository.updateTrialDates(
        subscriptionId,
        newTrialEnd,
        (subscription.trial_extended_count || 0) + 1,
        (subscription.trial_extended_days || 0) + additionalDays
      );

      return { newTrialEnd };
    } catch (error: any) {
      throw new SubscriptionError(`Failed to extend trial period: ${error.message}`);
    }
  }

  /**
   * Handles payment intent updates
   */
  public async handlePaymentIntentUpdate(paymentIntent: Stripe.PaymentIntent) {
    try {
      const result = await this.paymentProvider.handlePaymentIntentUpdate(paymentIntent);
      if (!result) return;

      const { paymentMethod, customerId } = result;
      if (!customerId) throw new BillingError("No customer ID found in payment intent");

      const { user, error: userError } = await this.userRepository.getByCustomerId(customerId);
      if (userError) throw userError;
      if (!user) throw new ResourceNotFoundError("User", customerId);

      // await this.updateSubscriptionStatus(paymentIntent.id, "active");

      // await this.billingRepository.create({
      //   customer_id: customerId,
      //   subscription_id: paymentIntent.id,
      //   price_id: paymentIntent.metadata.priceId,
      //   status: "active",
      //   trial_activated: false,
      // });
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Handles new customer creation from Stripe
   */
  public async handleNewCustomer(customer: Stripe.Customer) {
    try {
      const email = customer.email!;
      const name = customer.name || "";
      const phone = customer.phone || customer.metadata?.phoneNumber;
      const restaurantName = customer.metadata?.restaurantName;
      const sendInvoices = customer.metadata?.send_invoices === "false";
      let user: User | null = null;

      try {
        const { user: foundUser } = await this.userRepository.getByCustomerId(customer.id);
        user = foundUser;
      } catch (error) {}
      // try to find it with email
      if (!user) {
        try {
          const { user: foundUser } = await this.userRepository.getByEmail(email);
          user = foundUser;
        } catch (error) {
          // User not found by email either
        }
      }
      if (user) {
        await this.userRepository.update(user.id, {
          email: email,
          customer_name: name,
          stripe_customer_id: customer.id,
        });
        if (!user.restaurant_id && restaurantName) {
          const { restaurant } = await this.restaurantRepository.getByName(restaurantName);
          if (restaurant) {
            await this.userRepository.updateRestaurantId(user.id, restaurant.id);
          } else if (!restaurant) {
            const newRestaurant = await this.restaurantRepository.create({
              name: restaurantName,
              owner_id: user.id,
            });
            await this.userRepository.updateRestaurantId(user.id, newRestaurant.id);
          }
        }
      } else {
        const newUser = await this.userRepository.create({
          email,
          customer_name: name || "",
          phone: phone || "",
          stripe_customer_id: customer.id,
          role: "owner",
          subscriptionActive: false,
        });

        let { restaurant } = await this.restaurantRepository.getByName(restaurantName);
        if (!restaurant) {
          restaurant = await this.restaurantRepository.create({
            name: restaurantName,
            owner_id: newUser.id,
          });
        }
        await this.userRepository.update(newUser.id, {
          customer_name: name,
          stripe_customer_id: customer.id,
          restaurant_id: restaurant.id,
          role: "owner",
          subscriptionActive: false,
        });
      }
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Handles payment failure events
   */
  public async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
    try {
      const customerId = paymentIntent.customer as string;

      await supabase
        .from("subscriptions")
        .update({
          status: "payment_failed",
          is_active: false,
          updated_at: new Date(),
        })
        .eq("stripe_customer_id", customerId);

      await this.paymentProvider.handlePaymentFailure(paymentIntent);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Handles subscription updates (created/updated events)
   */
  public async handleSubscription(subscription: Stripe.Subscription) {
    try {
      const { id, customer: customerId, metadata } = subscription;
      if ((subscription.status = "trialing")) {
        //crate payment intent, and release the amount afterwards.
      }

      let user: User | null = null;
      let customer: Stripe.Customer | null = null;
      try {
        const { user: foundUser } = await this.userRepository.getByCustomerId(customerId as string);
        user = foundUser;
      } catch (error) {
        console.log("ERROR: ", error);
      }

      if (!user) {
        if (!metadata.email) {
          customer = await this.paymentProvider.getCustomerById(customerId as string);
          metadata.email = customer.email as string;
          metadata.name = customer.name as string;
        }
        try {
          const { user: foundUser } = await this.userRepository.getByEmail(metadata.email);
          user = foundUser;
        } catch (error) {
          // User not found by email
        }
      }
      if (user && !user.restaurant_id) {
        let { restaurant, error: restaurantError } = await this.restaurantRepository.getByOwnerId(
          user.id
        );
        if (restaurantError) throw new Error(`Restaurant by owner ID not found: ${user.id}`);
        if (restaurant) {
          await this.userRepository.updateRestaurantId(user.id, restaurant.id);
          user.restaurant_id = restaurant.id;
        } else {
          const restaurant = await this.restaurantRepository.findById(user.restaurant_id as string);
          if (restaurant) {
            await this.userRepository.updateRestaurantId(user.id, restaurant.id);
            user.restaurant_id = restaurant.id;
          }
        }
      }

      if (!user) {
        if (!customer) {
          // throw new ResourceNotFoundError("Customer", customerId as string);
          customer = await this.paymentProvider.findOrCreateCustomer({
            email: metadata.email,
            name: metadata.name,
            phoneNumber: metadata.phoneNumber,
            restaurantName: metadata.restaurantName,
            stripeCustomerId: customerId as string,
          });
        }

        user = await this.userRepository.create({
          email: customer.email!,
          customer_name: customer.name || "",
          phone: customer.phone || customer.metadata?.phoneNumber,
          stripe_customer_id: customerId as string,
          role: "owner",
          subscriptionActive: false,
        });

        const restaurantName = customer.metadata?.restaurantName;
        if (restaurantName) {
          const { restaurant, error: restaurantError } =
            await this.restaurantRepository.getByOwnerId(user.id);
          if (restaurantError) throw restaurantError;
          if (restaurant) {
            await this.userRepository.updateRestaurantId(user.id, restaurant.id);
            user.restaurant_id = restaurant.id;
          }
        }
      }

      if (!user.restaurant_id) {
        throw new BillingError("User must have a restaurant ID");
      }

      const { subscription: stripeSubscription, paymentMethod } =
        await this.paymentProvider.getSubscriptionDetails(id);

      const subscriptionData = this.paymentProvider.prepareSubscriptionData(
        stripeSubscription,
        paymentMethod
      );

      const fullSubscriptionData: SubscriptionData = {
        ...subscriptionData,
        restaurant_id: user.restaurant_id,
        profile_id: user.id,
        stripe_subscription_id: id,
      };
      if (!fullSubscriptionData.plan_id) {
        const priceId = subscription.items.data[0].plan.id;
        const price = subscription.items.data[0].plan.amount as number;
        const plan = await this.planService.getPlanByPriceOrPriceId(price, priceId);
        fullSubscriptionData.plan_id = plan.id;
      }
      const { data: sub, error: subError } = await this.billingRepository.getOrCreateSubscription(
        id,
        fullSubscriptionData
      );

      if (subError) throw subError;
      if (!sub) throw new SubscriptionError("Failed to create or get subscription");

      await this.billingRepository.recordSubscriptionHistory({
        subscription_id: sub.id,
        event_type: sub.status,
        event_data: subscription,
        user_id: user.id,
        restaurant_id: user.restaurant_id,
      });

      // const activeSubscriptions = await this.billingRepository.getActiveSubscriptionsForUser(
      //   user.id
      // );
      // if (activeSubscriptions.length > 0) {
      //   await this.billingRepository.updateUserSubscriptionStatus(user.id, true);
      // }

      // Mark checkout links as used when subscription becomes active
      try {
        const latestLink = await this.subscriptionCheckoutLinkService.getLatestLinkForUser(
          user.id,
          subscriptionData.plan_id
        );
        if (
          latestLink &&
          latestLink.status === "active" &&
          (subscriptionData.status === "active" || subscriptionData.status === "trialing")
        ) {
          await this.subscriptionCheckoutLinkService.markLinkAsUsed(latestLink.id);
        } else if (
          latestLink &&
          subscriptionData.status === "incomplete_expired" &&
          latestLink.status === "active"
        ) {
          await this.subscriptionCheckoutLinkService.markLinkAsExpired(latestLink.id);
        }
      } catch (error) {
        console.error("Failed to mark checkout link as used:", error);
        // Don't throw error as this is not critical
      }

      // uncomment this if need to see all logs related to subscription updates in slack channel
      // await this.paymentProvider.handleSubscription(subscription);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Handles subscription cancellation
   */
  public async handleSubscriptionCancellation(subscription: Stripe.Subscription) {
    const { user, error: userError } = await this.userRepository.getByCustomerId(
      subscription.customer as string
    );
    if (userError) throw userError;
    if (!user) throw new ResourceNotFoundError("User", subscription.customer as string);
    await supabase
      .from("subscriptions")
      .update({
        status: "canceled",
        is_active: false,
        canceled_at: new Date(subscription.canceled_at! * 1000),
        cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
        updated_at: new Date(),
      })
      .eq("stripe_subscription_id", subscription.id);

    await supabase.from("subscription_history").insert({
      subscription_id: subscription.id,
      event_type: "canceled",
      event_data: subscription,
      user_id: user.id,
      restaurant_id: user.restaurant_id,
    });

    // await this.userRepository.updateSubscriptionStatus(subscription.customer as string, false);
    await this.paymentProvider.handleSubscriptionCancellation(subscription);
  }

  /**
   * Handles scheduled subscription cancellation
   */
  public async handleScheduledSubscriptionCancellation(subscription: Stripe.SubscriptionSchedule) {
    const isCancellation =
      subscription.end_behavior === "cancel" && subscription.metadata?.cancel_reason !== undefined;

    if (!isCancellation) {
      return;
    }
    const { user, error: userError } = await this.userRepository.getByCustomerId(
      subscription.customer as string
    );
    if (userError) throw userError;
    if (!user) throw new ResourceNotFoundError("User", subscription.customer as string);
    await supabase
      .from("subscriptions")
      .update({
        status: "canceled",
        is_active: false,
        canceled_at: new Date(),
        cancel_at: subscription.current_phase?.end_date
          ? new Date(subscription.current_phase?.end_date * 1000)
          : null,
        updated_at: new Date(),
      })
      .eq("stripe_subscription_id", subscription.subscription);

    await supabase.from("subscription_history").insert({
      subscription_id: subscription.id,
      event_type: "canceled",
      event_data: subscription,
      user_id: user.id,
      restaurant_id: user.restaurant_id,
    });
  }
  /**
   * Handles invoice payment events
   */
  public async handleInvoicePayment(invoice: Stripe.Invoice) {
    const userResult = await this.userRepository.getByCustomerId(invoice.customer as string);
    const user = this.unwrapUser(userResult);

    await supabase
      .from("subscriptions")
      .update({
        status: "active",
        is_active: true,
        invoice_id: invoice.id,
        updated_at: new Date(),
      })
      .eq("stripe_subscription_id", invoice?.parent?.subscription_details?.subscription);
    const { billing: subscription, error: subscriptionError } =
      await this.billingRepository.getBySubscriptionId(
        invoice?.parent?.subscription_details?.subscription as string
      );
    if (subscriptionError) throw subscriptionError;
    if (!subscription)
      throw new ResourceNotFoundError(
        "Subscription",
        invoice?.parent?.subscription_details?.subscription as string
      );
    await this.billingRepository.recordSubscriptionHistory({
      subscription_id: subscription.id,
      event_type: "invoice_payment",
      event_data: invoice,
      user_id: user.id,
      restaurant_id: user.restaurant_id as string,
    });

    const hadPreviousFailedAttempt = invoice.attempt_count > 1;

    if (hadPreviousFailedAttempt) {
      // Only send notification if there was a previous failed attempt
      await this.paymentProvider.handleInvoicePayment(invoice);
    }
  }

  /**
   * Handles invoice payment failure events
   */
  public async handleInvoiceFailure(invoice: Stripe.Invoice) {
    const userResult = await this.userRepository.getByCustomerId(invoice.customer as string);
    const user = this.unwrapUser(userResult);
    const { data: _subscription, error: _subscriptionError } = await supabase
      .from("subscriptions")
      .update({
        status: "payment_failed",
        is_active: false,
        current_period_start: new Date(invoice.period_start * 1000),
        current_period_end: new Date(invoice.period_end * 1000),
        updated_at: new Date(),
      })
      .eq("stripe_subscription_id", invoice?.parent?.subscription_details?.subscription);

    const { billing: subscription, error: subscriptionError } =
      await this.billingRepository.getBySubscriptionId(
        invoice?.parent?.subscription_details?.subscription as string
      );
    if (subscriptionError) throw subscriptionError;
    if (!subscription)
      throw new ResourceNotFoundError(
        "Subscription",
        invoice?.parent?.subscription_details?.subscription as string
      );

    await this.billingRepository.recordSubscriptionHistory({
      subscription_id: subscription.id,
      event_type: "invoice_payment_failure",
      event_data: invoice,
      user_id: user.id,
      restaurant_id: user.restaurant_id as string,
    });

    await this.paymentProvider.handleInvoiceFailure(invoice, user.restaurant_id);
  }

  /**
   * Gets billing by customer ID
   */
  async getByCustomerId(customerId: string) {
    const { billing, error } = await this.billingRepository.getByCustomerId(customerId);
    if (error) {
      throw error;
    }
    return billing;
  }

  /**
   * Gets billing by subscription ID
   */
  async getBySubscriptionId(subscriptionId: string) {
    const { billing, error } = await this.billingRepository.getBySubscriptionId(subscriptionId);
    if (error) {
      throw error;
    }
    return billing;
  }

  /**
   * Updates trial dates
   */
  async updateTrialDates(
    subscriptionId: string,
    trialEndDate: Date,
    extendedCount: number,
    extendedDays: number
  ) {
    try {
      await this.billingRepository.updateTrialDates(
        subscriptionId,
        trialEndDate,
        extendedCount,
        extendedDays
      );
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Updates subscription status
   */
  async updateSubscriptionStatus(subscriptionId: string, status: string) {
    try {
      await this.billingRepository.updateSubscriptionStatus(subscriptionId, status);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Updates price ID
   */
  async updatePriceId(subscriptionId: string, priceId: string) {
    try {
      await this.billingRepository.updatePriceId(subscriptionId, priceId);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Creates a new billing record
   */
  async create(data: any) {
    try {
      const billing = await this.billingRepository.create(data);
      return billing;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Updates a billing record
   */
  async update(id: string, data: any) {
    try {
      const billing = await this.billingRepository.update(id, data);
      return billing;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Deletes a billing record
   */
  async delete(id: string) {
    try {
      await this.billingRepository.delete(id);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Handles customer updated events
   */
  public async handleCustomerUpdated(customer: Stripe.Customer) {
    const { email, name, metadata } = customer;

    if (!email) {
      throw new CustomerError("Customer email is required");
    }

    if (!customer.id) {
      throw new CustomerError("Customer ID is required");
    }

    const { user, error: userError } = await this.userRepository.getByEmail(email);
    if (userError) throw userError;
    if (!user) throw new ResourceNotFoundError("User", customer.id);

    await this.userRepository.update(user.id, {
      customer_name: name || "",
      stripe_customer_id: customer.id,
    });

    if (!user.restaurant_id) {
      const { restaurant, error: restaurantError } = await this.restaurantRepository.getByOwnerId(
        user.id
      );
      if (restaurantError) throw restaurantError;
      if (restaurant) {
        await this.userRepository.updateRestaurantId(user.id, restaurant.id);
      }
    }

    // Process any incomplete subscriptions
    await this.paymentProvider.handleCustomerUpdate(customer);
  }

  // Helper function to unwrap user
  private unwrapUser(userResult: { user: User | null; error: any }): User {
    if (userResult.error) {
      throw new BillingError(`User operation failed: ${userResult.error.message}`);
    }
    if (!userResult.user) {
      throw new ResourceNotFoundError("User");
    }
    return userResult.user;
  }

  /**
   * Extends a user's trial period
   */
  public async extendTrial(
    customerId: string,
    subscriptionId: string,
    days: number
  ): Promise<{ newTrialEnd: Date }> {
    try {
      const { user: profile, error: fetchError } = await this.userRepository.getByCustomerId(
        customerId
      );
      if (fetchError) throw fetchError;
      if (!profile) throw new ResourceNotFoundError("User", customerId);

      const { billing: subscription, error: subscriptionError } =
        await this.billingRepository.getBySubscriptionId(subscriptionId);
      if (subscriptionError) throw subscriptionError;
      if (!subscription) throw new ResourceNotFoundError("Subscription", subscriptionId);

      const { newTrialEnd } = await this.paymentProvider.extendTrialInStripe(
        customerId,
        subscriptionId,
        days
      );

      await this.billingRepository.updateTrialDates(
        subscriptionId,
        newTrialEnd,
        (subscription.trial_extended_count || 0) + 1,
        (subscription.trial_extended_days || 0) + days
      );

      return { newTrialEnd };
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Updates a user's subscription plan
   */
  public async updateSubscriptionPlan(stripeSubscriptionId: string, plan: IPlan): Promise<void> {
    try {
      await this.paymentProvider.updateSubscriptionPlanInStripe(stripeSubscriptionId, plan);

      await supabase
        .from("subscriptions")
        .update({
          plan_id: plan.id,
          updated_at: new Date(),
        })
        .eq("stripe_subscription_id", stripeSubscriptionId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Validates a coupon code
   */
  public async validateCoupon(couponCode: string): Promise<ICouponValidationResult> {
    try {
      return await this.paymentProvider.validateCoupon(couponCode);
    } catch (error: any) {
      throw new BillingError(`Failed to validate coupon: ${error.message}`);
    }
  }

  /**
   * Gets all active subscriptions for a user
   */
  private async getActiveSubscriptionsForUser(userId: string): Promise<any[]> {
    const { data: subscriptions, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("profile_id", userId)
      .eq("is_active", true);

    if (error) {
      throw new BillingError(`Failed to fetch active subscriptions: ${error.message}`);
    }

    return subscriptions || [];
  }

  /**
   * Creates a subscription directly without checkout session
   */
  public async createDirectSubscription(data: {
    planId: string;
    enableTrial?: boolean;
    trialDays?: number;
    restaurantId: string;
    salesRepSlackId?: string;
  }): Promise<any> {
    try {
      const { planId, enableTrial, trialDays, restaurantId, salesRepSlackId } = data;

      // Check for existing active subscriptions for this plan and restaurant to prevent duplicates
      const { data: planData, error: planError } = await supabase
        .from("plans")
        .select("*")
        .eq("id", planId)
        .single();

      if (planError || !planData) {
        throw new PlanError("Invalid plan");
      }

      // First, try to find users with active subscriptions
      const { data: restaurantUser, error: restaurantUserError } = await supabase
        .from("profiles")
        .select(
          `
          id,
          email,
          customer_name,
          phone,
          stripe_customer_id,
          restaurant_id,
          subscriptions!inner (
            id,
            status,
            payment_method_id
          )
        `
        )
        .eq("restaurant_id", restaurantId)
        .in("subscriptions.status", ["active", "trialing"]);
      const restaurant = await this.restaurantRepository.findById(restaurantId);
      if (restaurantUserError) {
        throw new BillingError("Failed to fetch restaurant user with active subscription");
      }

      // If we found users with active subscriptions, use the existing logic
      if (restaurantUser && restaurantUser.length > 0) {
        // Get the customer's default payment method from Stripe
        const stripeCustomer = (await stripe.customers.retrieve(
          restaurantUser[0].stripe_customer_id
        )) as Stripe.Customer;

        // Try to get default payment method first
        let paymentMethodId = stripeCustomer.invoice_settings?.default_payment_method as
          | string
          | null;

        // If no default payment method is found, get the list of attached payment methods
        if (!paymentMethodId) {
          const paymentMethods = await stripe.paymentMethods.list({
            customer: stripeCustomer.id,
            type: "card",
            limit: 10, // Fetch enough to ensure we get all payment methods
          });

          // Sort payment methods by created date in descending order (newest first)
          const sortedPaymentMethods = paymentMethods.data.sort((a, b) => b.created - a.created);

          // Use the most recent payment method if available
          if (sortedPaymentMethods.length > 0) {
            paymentMethodId = sortedPaymentMethods[0].id;
          }
        }

        if (!paymentMethodId || typeof paymentMethodId !== "string") {
          // No payment methods found, create checkout session
          console.log(
            "No payment methods found for user with active subscription, creating checkout session..."
          );
          return await this.createCheckoutSessionForUser(
            restaurantUser[0],
            planData,
            enableTrial,
            trialDays
          );
        }

        // Get the payment method details. For admin/direct subscriptions we skip the
        // separate pre-authorization (validateCardFunds) to avoid creating an
        // extra PaymentIntent that shows up as a canceled hold in Stripe. The
        // subscription creation below already attempts immediate payment and
        // will fail/throw if the payment cannot be completed, at which point
        // we fall back to the checkout-session flow.
        // const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
        // await this.validateCardFunds(
        //   planData.price,
        //   "usd",
        //   restaurantUser[0].stripe_customer_id,
        //   paymentMethod
        // );

        const subscription = await stripe.subscriptions.create({
          customer: restaurantUser[0].stripe_customer_id,
          items: [
            {
              price: planData.stripePriceId,
              quantity: 1,
            },
          ],
          trial_period_days: enableTrial ? trialDays : undefined,
          metadata: {
            id: planData.id,
            restaurantName: restaurant?.name || "",
            phoneNumber: restaurantUser[0].phone,
            sendInvoices: "false",
            name: restaurantUser[0].customer_name,
            price: `${Number(planData.price) / 100}`,
            email: restaurantUser[0].email,
            salesRepSlackId: salesRepSlackId || null,
          },
          payment_behavior: "error_if_incomplete",
          payment_settings: {
            payment_method_types: ["card"],
            save_default_payment_method: "on_subscription",
          },
          default_payment_method: paymentMethodId,
        });

        // Save subscription to database immediately to prevent duplicates
        try {
          const subscriptionData = this.paymentProvider.prepareSubscriptionData(subscription);
          const fullSubscriptionData: SubscriptionData = {
            ...subscriptionData,
            restaurant_id: restaurantUser[0].restaurant_id,
            profile_id: restaurantUser[0].id,
            stripe_subscription_id: subscription.id,
          };

          // Ensure plan_id is set
          if (!fullSubscriptionData.plan_id) {
            fullSubscriptionData.plan_id = planData.id;
          }

          await this.billingRepository.getOrCreateSubscription(
            subscription.id,
            fullSubscriptionData
          );
        } catch (dbError) {
          // Don't throw error as the Stripe subscription was created successfully
        }

        return subscription;
      }

      // If no active subscriptions found, get all users for the restaurant and find the one with stripe_customer_id
      const { data: usersWithoutActiveSub, error: userError } = await supabase
        .from("profiles")
        .select(
          `
          id,
          email,
          customer_name,
          phone,
          stripe_customer_id,
          restaurant_id,
          updated_at
        `
        )
        .eq("restaurant_id", restaurantId)
        .order("updated_at", { ascending: false });

      if (userError || !usersWithoutActiveSub || usersWithoutActiveSub.length === 0) {
        throw new BillingError("No user found for this restaurant");
      }

      // Find the user with stripe_customer_id
      const usersWithStripeId = usersWithoutActiveSub.filter((user) => user.stripe_customer_id);

      if (usersWithStripeId.length === 0) {
        throw new BillingError("No user found with a Stripe customer ID for this restaurant");
      }

      // Sort users by priority: latest updated first, then by order in the array
      const sortedUsersWithStripeId =
        usersWithoutActiveSub.length === usersWithStripeId.length
          ? usersWithoutActiveSub // Already ordered by updated_at desc
          : usersWithStripeId; // Use the filtered list in original order

      // Try each user with Stripe customer ID until one succeeds
      for (let i = 0; i < sortedUsersWithStripeId.length; i++) {
        const currentUser = sortedUsersWithStripeId[i];

        try {
          // Get the customer's default payment method from Stripe
          const stripeCustomer = (await stripe.customers.retrieve(
            currentUser.stripe_customer_id
          )) as Stripe.Customer;

          // Try to get default payment method first
          let paymentMethodId = stripeCustomer.invoice_settings?.default_payment_method as
            | string
            | null;

          // If no default payment method is found, get the list of attached payment methods
          if (!paymentMethodId) {
            const paymentMethods = await stripe.paymentMethods.list({
              customer: stripeCustomer.id,
              type: "card",
              limit: 10, // Fetch enough to ensure we get all payment methods
            });

            // Sort payment methods by created date in descending order (newest first)
            const sortedPaymentMethods = paymentMethods.data.sort((a, b) => b.created - a.created);

            // Use the most recent payment method if available
            if (sortedPaymentMethods.length > 0) {
              paymentMethodId = sortedPaymentMethods[0].id;
            }
          }
          if (!paymentMethodId || typeof paymentMethodId !== "string") {
            // If this is the last user and no payment methods found, create checkout session
            if (i === sortedUsersWithStripeId.length - 1) {
              console.log("No payment methods found for any user, creating checkout session...");
              return await this.createCheckoutSessionForUser(
                currentUser,
                planData,
                enableTrial,
                trialDays
              );
            }
            continue; // Try next user
          }

          // Get the payment method details. Skip the separate pre-authorization
          // for admin/direct subscriptions to avoid a visible canceled
          // PaymentIntent. The subscription creation will attempt the charge
          // immediately and we'll fall back to checkout if it fails.
          // const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
          // // Validate the card funds
          // await this.validateCardFunds(
          //   planData.price,
          //   "usd",
          //   currentUser.stripe_customer_id,
          //   paymentMethod
          // );

          // Use the sales rep slack ID that was already provided
          const mappedSalesRepSlackId = salesRepSlackId;

          // If validation succeeds, create the subscription directly
          const subscription = await stripe.subscriptions.create({
            customer: currentUser.stripe_customer_id,
            items: [
              {
                price: planData.stripePriceId,
                quantity: 1,
              },
            ],
            trial_period_days: enableTrial ? trialDays : undefined,
            metadata: {
              id: planData.id,
              restaurantName: currentUser.customer_name,
              phoneNumber: currentUser.phone,
              sendInvoices: "false",
              name: currentUser.customer_name,
              price: `${Number(planData.price) / 100}`,
              email: currentUser.email,
              salesRepSlackId: mappedSalesRepSlackId ?? null,
            },
            payment_behavior: "error_if_incomplete",
            payment_settings: {
              payment_method_types: ["card"],
              save_default_payment_method: "on_subscription",
            },
            default_payment_method: paymentMethodId,
          });

          // Save subscription to database immediately to prevent duplicates
          try {
            const subscriptionData = this.paymentProvider.prepareSubscriptionData(subscription);
            const fullSubscriptionData: SubscriptionData = {
              ...subscriptionData,
              restaurant_id: currentUser.restaurant_id,
              profile_id: currentUser.id,
              stripe_subscription_id: subscription.id,
            };

            // Ensure plan_id is set
            if (!fullSubscriptionData.plan_id) {
              fullSubscriptionData.plan_id = planData.id;
            }

            await this.billingRepository.getOrCreateSubscription(
              subscription.id,
              fullSubscriptionData
            );
          } catch (dbError) {
            // Don't throw error as the Stripe subscription was created successfully
          }

          return subscription;
        } catch (validationError: any) {
          // If this is the last user, create checkout session
          if (i === sortedUsersWithStripeId.length - 1) {
            return await this.createCheckoutSessionForUser(
              currentUser, // Use the last user for checkout session
              planData,
              enableTrial,
              trialDays
            );
          }
          // Otherwise, continue to next user
        }
      }

      // If we reach here, something went wrong - no users were processed
      throw new BillingError("No valid users found for subscription creation");
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Creates a checkout session for a user when direct subscription creation is not possible
   */
  private async createCheckoutSessionForUser(
    user: any,
    planData: any,
    enableTrial?: boolean,
    trialDays?: number
  ): Promise<string> {
    // Map sales rep slack ID from user email or phone
    const salesRepSlackId = getSalesRepSlackId(user.email, user.phone);

    // Create customer data object for checkout session with all required fields
    const customerData: ICustomerData & { stripeCustomerId: string } = {
      email: user.email || "",
      name: user.customer_name || "",
      restaurantName: user.customer_name || "",
      phoneNumber: user.phone || "",
      sendInvoices: false,
      stripeCustomerId: user.stripe_customer_id,
      salesRepSlackId: salesRepSlackId || undefined,
    };

    // Create plan object for checkout session
    const plan: IPlan = {
      id: planData.id,
      name: planData.name,
      description: planData.description,
      price: planData.price,
      currency: planData.currency,
      stripePriceId: planData.stripePriceId,
      trialDays: enableTrial ? trialDays || 0 : 0,
      features: planData.features,
      isActive: planData.isActive,
      createdAt: planData.created_at || new Date().toISOString(),
      updatedAt: planData.updated_at || new Date().toISOString(),
    };

    const originalCheckoutUrl = await this.createCheckoutSession(
      plan,
      customerData,
      undefined, // no coupon code
      process.env.NEXT_PUBLIC_BASE_URL
    );

    const linkId = await this.subscriptionCheckoutLinkService.createCheckoutLink(
      customerData,
      plan,
      user.stripe_customer_id,
      originalCheckoutUrl,
      user.id,
      user.restaurant_id,
      process.env.NEXT_PUBLIC_BASE_URL
    );

    // Return the full checkout link URL
    const checkoutLink = `${process.env.NEXT_PUBLIC_BASE_URL}/subscription/${linkId}`;

    return checkoutLink;
  }

  /**
   * Creates a billing portal session for a subscription
   */
  public async createBillingPortalSession(
    subscriptionId: string,
    returnUrl: string
  ): Promise<{ url: string }> {
    try {
      const { data: subscription, error } =
        await this.billingRepository.getSubscriptionWithCustomer(subscriptionId);
      if (error || !subscription) {
        throw new BillingError("Invalid subscription ID");
      }

      const stripe_customer_id = subscription.profiles.stripe_customer_id;
      if (!stripe_customer_id) {
        throw new BillingError("No customer ID found for subscription");
      }

      const portalSession = await this.paymentProvider.createBillingPortalSession(
        stripe_customer_id,
        returnUrl,
        subscriptionId.startsWith("sub_")
      );

      return { url: portalSession.url };
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Cancels a subscription with a reason
   */
  public async cancelSubscription(subscriptionId: string, reason: string): Promise<void> {
    try {
      // Get the subscription from Stripe
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      // Cancel in Stripe with reason
      await this.paymentProvider.cancelSubscription(subscriptionId, reason);

      // Update our database
      const { error: updateError } = await this.billingRepository.cancelSubscriptionWithReason(
        subscriptionId,
        reason
      );

      if (updateError) {
        throw new BillingError(`Failed to update subscription: ${updateError.message}`);
      }
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Undoes a subscription cancellation
   */
  public async undoSubscriptionCancellation(subscriptionId: string): Promise<void> {
    try {
      // Get subscription details from Stripe
      const { subscription } = await this.paymentProvider.getSubscriptionDetails(subscriptionId);

      if (!subscription) {
        throw new ResourceNotFoundError("Subscription", subscriptionId);
      }

      // Check if subscription is actually canceled
      if (!subscription.cancel_at) {
        throw new BillingError("Subscription is not canceled");
      }

      // Remove cancellation in Stripe
      await this.paymentProvider.undoSubscriptionCancellation(subscriptionId);

      // Update subscription in database
      await this.billingRepository.undoSubscriptionCancellation(subscriptionId);
    } catch (error: any) {
      throw new BillingError(`Failed to undo subscription cancellation: ${error.message}`);
    }
  }

  public async validateCardFunds(
    amount: number,
    currency: string,
    customer: string | Stripe.Customer | Stripe.DeletedCustomer,
    paymentMethod: Stripe.PaymentMethod
  ): Promise<void> {
    await this.paymentProvider.validateCardFunds(amount, currency, customer, paymentMethod);
  }
}
