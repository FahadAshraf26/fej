import { inject, injectable } from "tsyringe";
import { supabaseServer as supabase } from "@database/server.connection";
import { IPlan } from "interfaces/IPlan";
import { ICustomerData } from "interfaces/IStripe";
import type { ISubscriptionCheckoutLinkRepository } from "@repositories/interfaces/ISubscriptionCheckoutLinkRepository";
import { SubscriptionCheckoutLinkRepository } from "@repositories/implementations/SubscriptionCheckoutLinkRepository";
import { PaymentProviderService } from "./PaymentProviderService";
import { BillingError, ResourceNotFoundError } from "@utils/errors/DomainErrors";

@injectable()
export class SubscriptionCheckoutLinkService {
  constructor(
    @inject(SubscriptionCheckoutLinkRepository)
    private linkRepository: ISubscriptionCheckoutLinkRepository,
    @inject(PaymentProviderService) private paymentProvider: PaymentProviderService
  ) {}

  /**
   * Creates a checkout link and stores the data
   */
  public async createCheckoutLink(
    customerData: ICustomerData,
    plan: IPlan,
    stripeCustomerId: string,
    originalCheckoutUrl: string,
    userId: string,
    restaurantId: string,
    baseUrl?: string
  ): Promise<string> {
    try {
      // Set expiration to 24 hours from now (23 hours + 1 hour buffer)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { id, error } = await this.linkRepository.create({
        user_id: userId,
        restaurant_id: restaurantId,
        plan_id: plan.id,
        stripe_customer_id: stripeCustomerId,
        original_checkout_url: originalCheckoutUrl,
        expires_at: expiresAt,
        trial_days: plan.trialDays,
        trial_enabled: plan.trialDays > 0,
      });

      if (error) {
        throw new BillingError(`Failed to create checkout link: ${error.message}`);
      }

      return id;
    } catch (error: any) {
      throw new BillingError(`Failed to create checkout link: ${error.message}`);
    }
  }

  /**
   * Gets and validates a checkout link
   */
  public async getAndValidateLink(
    linkId: string,
    baseUrl?: string
  ): Promise<{
    isValid: boolean;
    isExpired: boolean;
    data?: any;
    newCheckoutUrl?: string;
  }> {
    try {
      const { data, error } = await this.linkRepository.getById(linkId);

      if (error || !data) {
        return { isValid: false, isExpired: false };
      }

      const now = new Date();

      const expiresAtDate = new Date(data.expires_at);
      const isDateExpired = now > expiresAtDate;

      const isStatusExpired = data.status === "expired";

      const isExpired = isDateExpired || isStatusExpired;

      if (isExpired) {
        const newCheckoutUrl = await this.handleExpiredLink(data, baseUrl);
        return { isValid: true, isExpired: true, data, newCheckoutUrl };
      }

      if (data.status === "used") {
        return { isValid: false, isExpired: false };
      }

      // Link is valid and not expired
      return { isValid: true, isExpired: false, data };
    } catch (error: any) {
      throw new BillingError(`Failed to validate checkout link: ${error.message}`);
    }
  }

  /**
   * Handles expired links by creating new checkout sessions
   */
  private async handleExpiredLink(linkData: any, baseUrl?: string): Promise<string | undefined> {
    try {
      // Clean up any incomplete subscriptions
      await this.cleanupExpiredSubscriptions(linkData.user_id, linkData.restaurant_id);

      // Prepare customer data from stored information
      const customerData: ICustomerData = {
        email: linkData.profiles.email,
        name: linkData.profiles.customer_name,
        phoneNumber: linkData.profiles.phone,
        restaurantName: linkData.restaurants.name,
        sendInvoices: false,
      };

      // Prepare plan data
      const plan: IPlan = {
        id: linkData.plans.id,
        name: linkData.plans.name,
        description: linkData.plans.description,
        price: linkData.plans.price,
        currency: linkData.plans.currency || "USD",
        stripePriceId: linkData.plans.stripePriceId,
        trialDays: linkData.trial_enabled ? linkData.trial_days : 0,
        features: linkData.plans.features || { tier: "basic" },
        isActive: linkData.plans.isActive !== false,
        createdAt: linkData.plans.createdAt || new Date().toISOString(),
        updatedAt: linkData.plans.updatedAt || new Date().toISOString(),
      };

      // Create new checkout session
      const checkoutSession = await this.paymentProvider.createSubscriptionCheckoutSession(
        plan,
        {
          ...customerData,
          stripeCustomerId: linkData.stripe_customer_id,
        },
        undefined, // couponCode
        baseUrl // baseUrl parameter
      );

      if (!checkoutSession?.url) {
        throw new BillingError("Failed to create new checkout session for expired link");
      }

      // Update the link with new checkout URL and reset expiration
      const newExpiresAt = new Date();
      newExpiresAt.setHours(newExpiresAt.getHours() + 24);

      await this.linkRepository.update({
        id: linkData.id,
        original_checkout_url: checkoutSession.url,
        expires_at: newExpiresAt,
        status: "active",
        updated_at: new Date(),
      });

      return checkoutSession.url;
    } catch (error: any) {
      console.log(`Failed to handle expired link: ${error.message}`);
    }
  }

  /**
   * Marks a link as used when subscription becomes active
   */
  public async markLinkAsUsed(linkId: string): Promise<void> {
    if (linkId) {
      try {
        const { error } = await this.linkRepository.updateStatus(linkId, "used");
        if (error) {
          console.log(`Failed to mark link as used: ${error.message}`);
        }
      } catch (error: any) {
        console.log(`Failed to mark link as used: ${error.message}`);
      }
    }
  }

  /**
   * Cleans up expired subscriptions when regenerating checkout links
   */
  private async cleanupExpiredSubscriptions(userId: string, restaurantId: string): Promise<void> {
    try {
      // Remove incomplete subscriptions for this user/restaurant
      await supabase
        .from("subscriptions")
        .delete()
        .eq("profile_id", userId)
        .eq("restaurant_id", restaurantId)
        .in("status", ["incomplete_expired"]);

      // Also clean up expired checkout links
      await this.linkRepository.cleanupExpiredLinks();
    } catch (error: any) {
      console.error("Failed to cleanup expired subscriptions:", error);
      // Don't throw error as this is cleanup operation
    }
  }

  /**
   * Gets the latest active link for a user and plan
   */
  public async getLatestLinkForUser(userId: string, planId: string): Promise<any> {
    try {
      const { data, error } = await this.linkRepository.getByUserAndPlan(userId, planId);

      if (error) {
        console.log(`Failed to get latest link: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      console.log(`Failed to get latest link: ${error.message}`);
    }
  }

  public async markLinkAsExpired(linkId: string): Promise<void> {
    if (linkId) {
      try {
        const { error } = await this.linkRepository.updateStatus(linkId, "expired");
        if (error) {
          console.error(`Failed to mark link as expired: ${error.message}`);
        }
      } catch (error: any) {
        console.error(`Failed to mark link as expired: ${error.message}`);
      }
    }
  }

  /**
   * Gets all checkout links for a restaurant
   */
  public async getCheckoutLinksByRestaurant(restaurantId: string): Promise<any[]> {
    try {
      const { data, error } = await this.linkRepository.getByRestaurant(restaurantId);

      if (error) {
        throw new BillingError(`Failed to fetch checkout links: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      throw new BillingError(`Failed to fetch checkout links: ${error.message}`);
    }
  }
}
