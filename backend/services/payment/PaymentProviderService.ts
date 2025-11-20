import { injectable } from "tsyringe";
import { API_VERSION, stripe } from "@Config/stripe";
import { StripeError } from "@errors/StripeError";
import { IPlan } from "interfaces/IPlan";
import { ICouponValidationResult, ICustomerData } from "interfaces/IStripe";
import Stripe from "stripe";
import { TRIAL_DAYS } from "@Config/app-settings";
import {
  dispatchErrorEvent,
  dispatchInfoEvent,
  dispatchPaymentIntentEvent,
  dispatchCustomerEvent,
  dispatchSubscriptionEvent,
  dispatchInvoiceEvent,
} from "@services/eventService";
import { supabaseServer as supabase } from "@database/server.connection";
import { addDays } from "@Helpers/CommonFunctions";
import { safeUnixToDate, unixToDate } from "@utils/time";
import { ISubscription } from "@utils/types/subscription";

/**
 * Service for handling payment provider (Stripe) specific operations
 */
@injectable()
export class PaymentProviderService {
  /**
   * Creates a checkout session for a subscription
   */
  public async createSubscriptionCheckoutSession(
    plan: IPlan,
    customerData: ICustomerData,
    couponCode?: string,
    baseUrl?: string,
    successUrl?: string,
    cancelUrl?: string
  ): Promise<Stripe.Checkout.Session> {
    try {
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        customer: customerData.stripeCustomerId,
        allow_promotion_codes: true,
        payment_method_types: ["card"],
        line_items: [
          {
            price: plan.stripePriceId,
            quantity: 1,
          },
        ],
        subscription_data: {
          metadata: {
            id: plan.id,
            restaurantName: customerData.restaurantName,
            phoneNumber: customerData.phoneNumber,
            sendInvoices: customerData.sendInvoices?.toString() ?? "false",
            name: customerData.name,
            price: `$${Number(plan.price) / 100}`,
            email: customerData.email,
            dealId: customerData.dealId ?? null,
            salesRepSlackId: customerData.salesRepSlackId ?? null,
          },
        },

        consent_collection: {
          terms_of_service: "required",
        },
        custom_text: {
          submit: {
            message:
              "Fully custom, eye-catching menu design, expertly crafted for your restaurant. Includes unlimited menu designs, unlimited menu revisions, unlimited menu optimizations",
          },
          terms_of_service_acceptance: {
            message:
              "I agree to Flapjack Inc's [Terms of Service](https://www.flapjack.co/terms-of-service) and [Privacy Policy](https://www.flapjack.co/privacy-policy)",
          },
        },
        mode: "subscription",
        success_url: successUrl || `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${baseUrl}/billing/cancel`,
      };

      // Only add trial if more than 0 days
      const trialDays = plan.trialDays ?? TRIAL_DAYS;
      if (trialDays > 0) {
        sessionParams.subscription_data = {
          ...sessionParams.subscription_data,
          trial_period_days: trialDays,
        };
      }
      return stripe.checkout.sessions.create(sessionParams);
    } catch (error: any) {
      dispatchErrorEvent(`Checkout session creation error: ${error.message}`);
      throw new StripeError(`Failed to create checkout session: ${error.message}`);
    }
  }

  /**
   * Applies a coupon to a price
   */
  public async applyCoupon(price: number, couponCode: string) {
    try {
      const coupon = await stripe.coupons.retrieve(couponCode);
      let finalAmount = price;

      if (coupon.percent_off) {
        finalAmount = Math.round(price * (1 - coupon.percent_off / 100));
      } else if (coupon.amount_off) {
        finalAmount = Math.max(0, price - coupon.amount_off);
      }

      return { finalAmount, appliedCoupon: couponCode };
    } catch (error: any) {
      console.log(error, `Invalid coupon attempted: ${couponCode}`);
      return { finalAmount: price };
    }
  }

  /**
   * Finds or creates a Stripe customer
   */
  public async findOrCreateCustomer(customerData: ICustomerData): Promise<Stripe.Customer> {
    const { email, name, phoneNumber, restaurantName, sendInvoices } = customerData;

    if (!email) {
      const error = new StripeError("Email is required to create a customer");
      dispatchErrorEvent(error.message, { email, restaurantName });
      throw error;
    }

    try {
      // Verify Stripe is configured
      if (!stripe) {
        const error = new StripeError("Payment provider is not configured");
        dispatchErrorEvent(error.message, { email, restaurantName });
        throw error;
      }

      const existingCustomer = await stripe.customers
        .search({
          query: `email:"${email}"`,
          limit: 1,
        })
        .then((result) => result.data[0]);

      if (existingCustomer) {
        // Update existing customer with invoice preferences if provided
        if (sendInvoices !== undefined) {
          const updatedCustomer = await stripe.customers.update(existingCustomer.id, {
            invoice_settings: {
              default_payment_method: existingCustomer.invoice_settings
                ?.default_payment_method as string,
            },
            metadata: {
              ...existingCustomer.metadata,
              restaurantName,
              phoneNumber,
              send_invoices: sendInvoices.toString(),
            },
          });

          dispatchCustomerEvent(updatedCustomer, false);

          return updatedCustomer;
        }

        dispatchCustomerEvent(existingCustomer, false);

        return existingCustomer;
      }

      const newCustomer = await stripe.customers.create({
        email,
        name,
        phone: phoneNumber,
        metadata: {
          restaurantName,
          phoneNumber,
          send_invoices: sendInvoices !== undefined ? sendInvoices.toString() : "false",
        },
      });

      if (!newCustomer || !newCustomer.id) {
        const error = new StripeError(
          "Failed to create customer: No customer ID returned from Stripe"
        );
        dispatchErrorEvent(error.message, { email, restaurantName });
        throw error;
      }

      dispatchCustomerEvent(newCustomer, true);

      return newCustomer;
    } catch (error: any) {
      const errorMessage =
        error instanceof StripeError
          ? error.message
          : `Customer creation failed: ${error.message || "Unknown error"}`;

      dispatchErrorEvent(errorMessage, {
        email,
        restaurantName,
        phoneNumber,
        errorType: error.type,
        errorCode: error.code,
      });

      throw new StripeError(errorMessage);
    }
  }

  /**
   * Validates a coupon code
   */
  public async validateCoupon(couponCode: string): Promise<ICouponValidationResult> {
    try {
      const coupon = await stripe.coupons.retrieve(couponCode);

      if (coupon.valid) {
        return {
          valid: true,
          percentOff: coupon.percent_off ?? undefined,
          amountOff: coupon.amount_off ?? undefined,
          currency: coupon.currency ?? undefined,
        };
      }
      return { valid: false };
    } catch (error) {
      return { valid: false };
    }
  }

  /**
   * Extends trial period in Stripe
   */
  public async extendTrialInStripe(
    customerId: string,
    subscriptionId: string,
    days: number
  ): Promise<{ newTrialEnd: Date }> {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      if (!subscription.trial_end) {
        throw new StripeError("This subscription is not in a trial period");
      }

      const currentTrialEnd = subscription.trial_end;
      const newTrialEnd = currentTrialEnd + days * 24 * 60 * 60;

      await stripe.subscriptions.update(subscriptionId, {
        trial_end: newTrialEnd,
        proration_behavior: "none",
      });

      return { newTrialEnd: new Date(newTrialEnd * 1000) };
    } catch (error: any) {
      throw new StripeError(`Failed to extend trial in Stripe: ${error.message}`);
    }
  }

  /**
   * Updates subscription plan in Stripe
   */
  public async updateSubscriptionPlanInStripe(subscriptionId: string, plan: IPlan): Promise<void> {
    try {
      // Get the subscription directly using the subscription ID
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      await stripe.subscriptions.update(subscriptionId, {
        items: [
          {
            id: subscription.items.data[0].id,
            price: plan.stripePriceId,
          },
        ],
        proration_behavior: "none",
      });

      dispatchInfoEvent(
        `Updated subscription plan for subscription ${subscriptionId} to ${plan.name}`
      );
    } catch (error: any) {
      throw new StripeError(`Failed to update subscription plan: ${error.message}`);
    }
  }

  /**
   * Returns the phases for a subscription based on the amount
   */
  private returnPhaseBasedOnPlan = (
    amount: number,
    paymentMethodId: string,
    trailTimestamp: number,
    nextBillingTimestamp: number
  ) => {
    switch (amount) {
      case 34900:
      case 39900:
        return [
          {
            items: [
              {
                price:
                  amount === 34900
                    ? process.env.PRODUCT_PRICE_ID_2
                    : process.env.PRODUCT_PRICE_ID_3,
              },
            ],
            default_payment_method: paymentMethodId,
            trial_end: trailTimestamp,
          },
        ];
      default:
        return [
          {
            items: [
              {
                price: process.env.PRODUCT_PRICE_ID,
              },
            ],
            default_payment_method: paymentMethodId,
            trial_end: trailTimestamp,
            end_date: nextBillingTimestamp,
          },
          {
            items: [
              {
                price: process.env.PRODUCT_PRICE_ID,
              },
            ],
            billing_cycle_anchor: "phase_start",
            proration_behavior: "none",
          },
        ];
    }
  };

  /**
   * Handles payment intent updates
   */
  public async handlePaymentIntentUpdate(paymentIntent: Stripe.PaymentIntent) {
    if (paymentIntent.status === "requires_capture") {
      await stripe.paymentIntents.cancel(paymentIntent.id);
      const paymentMethod = await stripe.paymentMethods.retrieve(
        paymentIntent.payment_method as string
      );

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("stripe_customer_id", paymentIntent.customer as string)
        .single();

      let nextBillingDate = addDays(28);
      let trailDate = addDays(
        paymentIntent.amount === 39900 ||
          paymentIntent.amount === 34900 ||
          paymentIntent.metadata.trialDays === TRIAL_DAYS.toString()
          ? 10
          : 14
      );
      const nextBillingTimestamp = Math.floor(nextBillingDate.getTime() / 1000);
      const trailTimestamp = Math.floor(trailDate.getTime() / 1000);
      const phases: any = this.returnPhaseBasedOnPlan(
        paymentIntent.amount,
        paymentMethod.id,
        trailTimestamp,
        nextBillingTimestamp
      );

      if (profile !== null && profile.subscriptionActive !== true) {
        await stripe.subscriptionSchedules.create({
          customer: paymentIntent.customer as string,
          start_date: "now",
          end_behavior: "release",
          phases,
        });
        await supabase
          .from("profiles")
          .update({
            subscriptionActive: true,
          })
          .eq("stripe_customer_id", paymentIntent.customer as string);
      } else {
        await stripe.subscriptionSchedules.create({
          customer: paymentIntent.customer as string,
          start_date: "now",
          end_behavior: "release",
          phases,
        });
      }

      return {
        paymentMethod,
        customerId: paymentIntent.customer as string,
      };
    }
    return null;
  }

  public async getCustomerById(customerId: string): Promise<Stripe.Customer> {
    try {
      return (await stripe.customers.retrieve(customerId)) as Stripe.Customer;
    } catch (error) {
      console.error("Error retrieving customer:", error);
      throw error;
    }
  }

  /**
   * Handles payment failure events
   */
  public async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
    dispatchPaymentIntentEvent(paymentIntent);
  }

  /**
   * Handles subscription updates
   */
  public async handleSubscription(subscription: Stripe.Subscription) {
    dispatchSubscriptionEvent(subscription, "updated");
  }

  /**
   * Handles subscription cancellation
   */
  public async handleSubscriptionCancellation(subscription: Stripe.Subscription) {
    dispatchSubscriptionEvent(subscription, "cancelled");
  }

  /**
   * Gets subscription details from Stripe
   */
  public async getSubscriptionDetails(subscriptionId: string): Promise<{
    subscription: Stripe.Subscription;
    paymentMethod?: Stripe.PaymentMethod;
  }> {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      let paymentMethod;

      if (subscription.default_payment_method) {
        paymentMethod = await stripe.paymentMethods.retrieve(
          subscription.default_payment_method as string
        );
      }

      return { subscription, paymentMethod };
    } catch (error: any) {
      dispatchErrorEvent(`Failed to get subscription details: ${error.message}`);
      throw new StripeError(`Failed to get subscription details: ${error.message}`);
    }
  }

  /**
   * Prepares subscription data from Stripe subscription
   */
  public prepareSubscriptionData(
    subscription: Stripe.Subscription,
    paymentMethod?: Stripe.PaymentMethod
  ): ISubscription {
    // Input validation
    if (!subscription) {
      throw new Error("Subscription is required");
    }

    // Constants for better maintainability
    const MILLISECONDS_PER_SECOND = 1000;
    const ACTIVE_STATUSES = ["active", "trialing"] as const;

    // Destructure with defaults and validation
    const {
      status,
      items,
      trial_end,
      metadata = {},
      latest_invoice,
      canceled_at,
      cancel_at,
      pause_collection,
    } = subscription;

    // Validate required data
    if (!items?.data?.[0]) {
      throw new Error("Subscription items data is missing or invalid");
    }

    if (!status) {
      throw new Error("Subscription status is missing");
    }

    const { current_period_start, current_period_end } = items.data[0];

    // Validate period timestamps
    if (!current_period_start || !current_period_end) {
      throw new Error("Current period dates are missing from subscription items");
    }

    // Helper function to determine if subscription is active
    const isSubscriptionActive = (
      subscriptionStatus: string,
      pauseCollection?: Stripe.Subscription.PauseCollection | null
    ): boolean => {
      return (
        ACTIVE_STATUSES.includes(subscriptionStatus as (typeof ACTIVE_STATUSES)[number]) &&
        !pauseCollection
      );
    };

    // Determine subscription status and activity
    const isActive = isSubscriptionActive(status, pause_collection);
    const subscriptionStatus = isActive ? status : "failed";

    // Build base subscription data
    const subscriptionData: ISubscription = {
      status: subscriptionStatus,
      current_period_start: unixToDate(current_period_start),
      current_period_end: unixToDate(current_period_end),
      updated_at: new Date(),
      is_active: isActive,
      plan_id: metadata.plan_id || metadata.id || "",
      latest_invoice_id: (latest_invoice as string) || "",
      send_invoices: metadata?.send_invoives === "true",
      canceled_at: safeUnixToDate(canceled_at),
      cancel_at: safeUnixToDate(cancel_at),
    };

    // Handle trial information if present
    if (trial_end) {
      const trialEndDate = unixToDate(trial_end);
      subscriptionData.trial_end_date = trialEndDate;
      subscriptionData.trial_activated = true;

      // Calculate trial start date more intelligently
      // If we have created timestamp, use that; otherwise fallback to current period start
      const trialStartTimestamp = subscription.created || current_period_start;
      subscriptionData.trial_start_date = unixToDate(trialStartTimestamp);
      subscriptionData.original_trial_end_date = trialEndDate;
    }

    // Add payment method if provided
    if (paymentMethod?.id) {
      subscriptionData.payment_method_id = paymentMethod.id;
    }

    return subscriptionData;
  }

  /**
   * Handles invoice payment events
   */
  public async handleInvoicePayment(invoice: Stripe.Invoice) {
    dispatchInvoiceEvent(invoice, "paid");
  }

  /**
   * Handles invoice payment failure events
   */
  public async handleInvoiceFailure(invoice: Stripe.Invoice, restaurantId?: string) {
    dispatchInvoiceEvent({ ...invoice, restaurantId: restaurantId }, "failed");
  }

  /**
   * Creates a billing portal session for a customer
   */
  public async createBillingPortalSession(
    customerId: string,
    returnUrl: string,
    autoClose: boolean = false
  ): Promise<Stripe.BillingPortal.Session> {
    try {
      // Create or get portal configuration
      const configurations = await stripe.billingPortal.configurations.list();
      let configId = configurations.data[0]?.id;

      if (!configId) {
        const config = await stripe.billingPortal.configurations.create({
          features: {
            payment_method_update: {
              enabled: true,
            },
            subscription_cancel: {
              enabled: false,
            },
            subscription_update: {
              enabled: false,
            },
            customer_update: {
              enabled: false,
            },
            invoice_history: {
              enabled: false,
            },
          },
        });
        configId = config.id;
      }

      return await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
        configuration: configId,
        flow_data: autoClose
          ? {
              type: "payment_method_update",
              after_completion: {
                type: "redirect",
                redirect: {
                  return_url: returnUrl,
                },
              },
            }
          : undefined,
      });
    } catch (error: any) {
      throw new StripeError(`Failed to create billing portal session: ${error.message}`);
    }
  }

  /**
   * Cancels a subscription in Stripe with a reason
   */
  public async cancelSubscription(subscriptionId: string, reason: string): Promise<string> {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      if (subscription.schedule) {
        await stripe.subscriptionSchedules.update(subscription.schedule as string, {
          end_behavior: "cancel",
          metadata: { cancel_reason: reason },
        });
      } else {
        await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
          cancellation_details: {
            comment: reason,
          },
        });
      }
      return subscriptionId;
    } catch (error: any) {
      dispatchErrorEvent(`Failed to cancel subscription in Stripe: ${error.message}`);
      throw new StripeError(`Failed to cancel subscription: ${error.message}`);
    }
  }

  /**
   * Undoes a subscription cancellation in Stripe
   */
  public async undoSubscriptionCancellation(subscriptionId: string): Promise<void> {
    try {
      const { data: trialEnd, error: trialEndError } = await supabase
        .from("subscriptions")
        .select("trial_end_date")
        .eq("stripe_subscription_id", subscriptionId)
        .single();

      const updateParams: Stripe.SubscriptionUpdateParams = {
        cancel_at: null,
        trial_end: "now",
      };

      if (trialEnd?.trial_end_date) {
        const trialEndTimestamp = Math.floor(new Date(trialEnd.trial_end_date).getTime() / 1000);
        updateParams.trial_end = trialEndTimestamp;
      }

      await stripe.subscriptions.update(subscriptionId, updateParams);

      dispatchInfoEvent(`Stripe subscription ${subscriptionId} reactivated`);
    } catch (error: any) {
      dispatchErrorEvent(`Failed to undo Stripe subscription cancellation: ${error.message}`);
      throw new StripeError(`Failed to undo subscription cancellation: ${error.message}`);
    }
  }

  /**
   * Handles customer updates and processes incomplete subscriptions
   */
  public async handleCustomerUpdate(customer: Stripe.Customer): Promise<void> {
    try {
      const { data: subscriptions, error } = await supabase
        .from("subscriptions")
        .select("*, profiles!inner (stripe_customer_id)")
        .eq("profiles.stripe_customer_id", customer.id)
        .in("status", ["incomplete", "past_due", "unpaid", "failed", "payment_failed"]);

      if (error) {
        const errorMessage = `Failed to fetch subscriptions: ${error.message}`;
        dispatchErrorEvent(errorMessage, { customerId: customer.id });
        throw new StripeError(errorMessage);
      }

      if (!subscriptions || subscriptions.length === 0) {
        return;
      }
      // Get the customer's most recent payment method
      let latestPaymentMethod: string | null = null;
      try {
        const paymentMethods = await stripe.paymentMethods.list({
          customer: customer.id,
          type: "card",
          limit: 1,
        });

        if (paymentMethods.data.length > 0) {
          latestPaymentMethod = paymentMethods.data[0].id;
        }
      } catch (error: any) {
        const errorMessage = `Failed to fetch payment methods for customer ${customer.id}: ${error.message}`;
        dispatchErrorEvent(errorMessage, {
          customerId: customer.id,
          restaurantName: customer.metadata.restaurantName,
        });
        return; // Can't proceed without a payment method
      }
      console.log("latestPaymentMethod", latestPaymentMethod);
      console.log("subscriptions", subscriptions);
      // Process each subscription
      for (const subscription of subscriptions) {
        try {
          const invoices = await stripe.invoices.list({
            customer: customer.id,
            subscription: subscription.stripe_subscription_id,
            status: "open",
            limit: 1,
          });

          if (invoices.data.length > 0) {
            const invoice = invoices.data[0];

            if (!latestPaymentMethod || typeof latestPaymentMethod !== "string") {
              const errorMessage = `No valid default payment method found for customer ${customer.id}`;
              dispatchErrorEvent(errorMessage, {
                customerId: customer.id,
                subscriptionId: subscription.stripe_subscription_id,
                restaurantName: customer.metadata.restaurantName,
              });
              continue;
            }

            // Attempt to pay the invoice with the new payment method
            const paidInvoice = await stripe.invoices.pay(invoice.id as string, {
              payment_method: latestPaymentMethod,
            });

            dispatchInvoiceEvent(paidInvoice, "paid");

            // If payment is successful, update subscription status, default payment method
            if (paidInvoice.status === "paid") {
              await stripe.customers.update(customer.id, {
                invoice_settings: {
                  default_payment_method: latestPaymentMethod,
                },
              });
              dispatchSubscriptionEvent(
                await stripe.subscriptions.retrieve(subscription.stripe_subscription_id),
                "updated"
              );
            }
          }
        } catch (error: any) {
          const errorMessage = `Error processing subscription ${subscription.stripe_subscription_id}: ${error.message}`;
          dispatchErrorEvent(errorMessage, {
            customerId: customer.id,
            subscriptionId: subscription.stripe_subscription_id,
            restaurantName: customer.metadata.restaurantName,
          });
        }
      }
    } catch (error: any) {
      const errorMessage = `Failed to process customer update: ${error.message}`;
      dispatchErrorEvent(errorMessage, {
        customerId: customer.id,
        restaurantName: customer.metadata.restaurantName,
      });
    }
  }

  /**
   * Validates card by reusing existing PaymentIntent from checkout or creating a new one
   * Ensures only ONE PaymentIntent exists and appears in the Stripe dashboard
   */
  public async validateCardFunds(
    amount: number,
    currency: string,
    customer: string | Stripe.Customer | Stripe.DeletedCustomer,
    paymentMethod: Stripe.PaymentMethod
  ): Promise<void> {
    const customerId = typeof customer === "string" ? customer : customer.id;
    let paymentIntent: Stripe.PaymentIntent | null = null;

    // STEP 1: Check for existing PaymentIntent from checkout that we can reuse
    try {
      const existingPaymentIntents = await stripe.paymentIntents.list({
        customer: customerId,
        limit: 10,
      });

      // Find a PaymentIntent that is:
      // - Still active (requires_capture or processing)
      // - Created recently (within last 5 minutes)
      // - Not already canceled
      // - Uses the SAME payment method (important to prevent wrong card validation)
      for (const existingPI of existingPaymentIntents.data) {
        const isRecent = (Date.now() / 1000 - existingPI.created) < 300; // 5 minutes
        const isActive = 
          existingPI.status === "requires_capture" || 
          existingPI.status === "processing";
        const samePaymentMethod = existingPI.payment_method === paymentMethod.id;
        
        if (isRecent && isActive && existingPI.status !== "canceled" && samePaymentMethod) {
          // Found an existing PaymentIntent we can reuse!
          paymentIntent = existingPI;
          console.log(`Reusing existing PaymentIntent ${paymentIntent.id} from checkout`);
          break;
        }
      }
    } catch (listError: any) {
      // Log but don't fail - we'll create a new PaymentIntent
      console.error("Error listing existing PaymentIntents:", listError);
    }

    // STEP 2: If no existing PaymentIntent found, create a new validation one
    if (!paymentIntent) {
      paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        customer: customerId,
        payment_method: paymentMethod.id,
        confirm: true,
        off_session: true,
        capture_method: "manual", // Authorize without charging
      });
      console.log(`Created new validation PaymentIntent ${paymentIntent.id}`);
    }

    // STEP 3: Wait for PaymentIntent to reach requires_capture status
    let finalPaymentIntent = paymentIntent;
    let retries = 0;
    const maxRetries = 15;
    const retryDelay = 200;

    while (
      finalPaymentIntent.status !== "requires_capture" &&
      finalPaymentIntent.status !== "succeeded" &&
      finalPaymentIntent.status !== "canceled" &&
      retries < maxRetries
    ) {
      if (finalPaymentIntent.status === "processing") {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        finalPaymentIntent = await stripe.paymentIntents.retrieve(paymentIntent.id);
        retries++;
      } else {
        break;
      }
    }

    // STEP 4: Cancel the PaymentIntent (so it shows in dashboard)
    if (finalPaymentIntent.status === "requires_capture") {
      try {
        await stripe.paymentIntents.cancel(paymentIntent.id);
        console.log("Card validation successful, payment intent cancelled", {
          paymentIntentId: paymentIntent.id,
        });
        return;
      } catch (cancelError: any) {
        if (
          cancelError.code === "payment_intent_canceled" ||
          cancelError.message?.includes("already canceled")
        ) {
          console.log("PaymentIntent already canceled", paymentIntent.id);
          return;
        }
        console.error("Error canceling PaymentIntent:", cancelError);
        throw new Error("Card validation failed - could not cancel payment intent");
      }
    } else if (finalPaymentIntent.status === "succeeded") {
      throw new Error("Card validation failed - payment was captured unexpectedly");
    } else if (finalPaymentIntent.status === "canceled") {
      console.log("PaymentIntent was already canceled", paymentIntent.id);
      return;
    } else {
      throw new Error("Card validation failed - insufficient funds or card declined");
    }
  }

  private dispatchErrorEvent(error: Error | string, context: any = {}) {
    const errorMessage = error instanceof Error ? error.message : error;
    dispatchErrorEvent(errorMessage, context);
  }

  private dispatchInfoEvent(message: string, context: any = {}) {
    dispatchInfoEvent(message, context);
  }

  private dispatchPaymentIntentEvent(paymentIntent: Stripe.PaymentIntent) {
    dispatchPaymentIntentEvent(paymentIntent);
  }

  private dispatchCustomerEvent(customer: Stripe.Customer, isNew: boolean = true) {
    dispatchCustomerEvent(customer, isNew);
  }

  private dispatchSubscriptionEvent(
    subscription: Stripe.Subscription,
    status: "created" | "updated" | "cancelled" = "created"
  ) {
    dispatchSubscriptionEvent(subscription, status);
  }

  private dispatchInvoiceEvent(invoice: Stripe.Invoice, status: "paid" | "failed" = "paid") {
    dispatchInvoiceEvent(invoice, status);
  }
}
