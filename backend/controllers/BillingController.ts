import { BillingService } from "@services/payment/BillingService";
import { sendErrorNotification } from "@services/slackService";
import { StripeError } from "utils/errors/StripeError";
import { PlanError } from "utils/errors/PlanError";
import { Authenticate } from "../decorators/authDecorator";
import { getSalesRepSlackId } from "@utils/salesRepMapping";
import type { NextApiRequest, NextApiResponse } from "next";
import { container, injectable, inject } from "tsyringe";

@injectable()
export class BillingController {
  constructor(@inject(BillingService) private billingService: BillingService) {}

  async post(req: NextApiRequest, res: NextApiResponse) {
    const { email, name, restaurantName, phoneNumber, plan, couponCode, baseUrl, loggedInUser } = JSON.parse(
      req.body
    );
    
    // Map sales rep slack ID from logged-in user's email or phone, not the form data
    const salesRepSlackId = getSalesRepSlackId(loggedInUser?.email, loggedInUser?.phone);
    
    try {
      const checkoutUrl = await this.billingService.setupSubscription(
        { 
          email: email.toLowerCase(), 
          name, 
          restaurantName, 
          phoneNumber,
          salesRepSlackId
        },
        plan,
        couponCode,
        baseUrl
      );
      res.status(200).json({ checkoutUrl });
    } catch (error: any) {
      sendErrorNotification(`Subscription setup error: ${error.message}`);
      const status = error instanceof StripeError ? 400 : 500;
      res.status(status).json({
        message: error.message,
        name: error.name,
        code: error.code,
        metadata: error.metadata,
      });
    }
  }

  async get(req: NextApiRequest, res: NextApiResponse) {
    const { couponCode } = req.query;

    if (!couponCode || typeof couponCode !== "string") {
      return res.status(400).json({ message: "Coupon code is required" });
    }

    const couponValidation = await this.billingService.validateCoupon(couponCode);
    res.status(200).json(couponValidation);
  }

  /**
   * Extend a user's trial period
   */
  @Authenticate({ requiredRoles: ["flapjack"] })
  public async extendTrial(req: NextApiRequest, res: NextApiResponse) {
    try {
      const { customerId, days, subscriptionId } = req.body;

      if (!customerId || !days || days < 1 || days > 21) {
        return res.status(400).json({
          message: "Invalid request. Days must be between 1 and 21.",
        });
      }

      const result = await this.billingService.extendTrial(customerId, subscriptionId, days);

      return res.status(200).json({
        message: "Trial extended successfully",
        newTrialEnd: result.newTrialEnd,
      });
    } catch (error) {
      console.error("Error extending trial:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Update a user's subscription plan
   */
  @Authenticate({ requiredRoles: ["flapjack"] })
  public async updateSubscriptionPlan(req: NextApiRequest, res: NextApiResponse) {
    try {
      const { stripeSubscriptionId, plan } = req.body;

      if (!stripeSubscriptionId || !plan) {
        return res.status(400).json({ message: "Missing required parameters" });
      }

      await this.billingService.updateSubscriptionPlan(stripeSubscriptionId, plan);
      return res.status(200).json({ message: "Subscription plan updated successfully" });
    } catch (error) {
      console.error("Error updating subscription plan:", error);
      if (error instanceof PlanError) {
        return res.status(error.statusCode || 500).json({ error: error.message });
      }
      return res.status(500).json({ error: "Failed to update subscription plan" });
    }
  }

  /**
   * Creates a subscription directly without checkout session 
   */
  @Authenticate({ requiredRoles: ["flapjack"] })
  public async createSubscription(req: NextApiRequest, res: NextApiResponse) {
    try {
      const { planId, enableTrial, trialDays, restaurantId } = req.body;
      const authenticatedReq = req as any; // AuthenticatedRequest

      if (!planId || !restaurantId) {
        return res.status(400).json({ message: "Missing required parameters" });
      }

      // Map sales rep slack ID from logged-in user's email and phone (both from Supabase Auth)
      const userEmail = authenticatedReq.session?.user?.email;
      const userPhone = authenticatedReq.session?.user?.phone;
      const salesRepSlackId = getSalesRepSlackId(userEmail, userPhone);

      const result = await this.billingService.createDirectSubscription({
        planId,
        enableTrial,
        trialDays,
        restaurantId,
        salesRepSlackId,
      });

      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Error in createSubscription:", error);

      // Handle specific error types
      if (error.name === "BillingError" || error.name === "PlanError") {
        return res.status(400).json({
          message: error.message,
          name: error.name,
        });
      }

      return res.status(500).json({
        message: error.message || "Failed to create subscription",
      });
    }
  }

  /**
   * Creates a billing portal session for a subscription
   */
  // @Authenticate({ requiredRoles: ["user"] })
  public async createPortalSession(req: NextApiRequest, res: NextApiResponse) {
    try {
      const { returnUrl, subscription_id } = req.body;
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      const returnUrlWithBase = returnUrl ? `${baseUrl}${returnUrl}` : `${baseUrl}/templates`;
      if (!subscription_id) {
        return res.status(400).json({ error: "Subscription ID is required" });
      }
      const result = await this.billingService.createBillingPortalSession(
        subscription_id,
        returnUrlWithBase
      );
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Error creating portal session:", error);
      return res.status(500).json({ error: error.message || "Failed to create portal session" });
    }
  }

  /**
   * Cancel a subscription
   */
  @Authenticate({ requiredRoles: ["flapjack"] })
  public async cancelSubscription(req: NextApiRequest) {
    try {
      const { subscriptionId, reason } = req.body;

      if (!subscriptionId || !reason) {
        throw new Error("Missing required parameters");
      }

      await this.billingService.cancelSubscription(subscriptionId, reason);
      return { success: true };
    } catch (error: any) {
      console.error("Error canceling subscription:", error);
      throw error;
    }
  }

  public async validateCardFunds(req: NextApiRequest, res: NextApiResponse) {
    try {
      const { amount, currency, customerId, paymentMethodId } = req.body;
      await this.billingService.validateCardFunds(amount, currency, customerId, paymentMethodId);
      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error("Error validating card funds:", error);
      return res.status(500).json({ error: error.message || "Failed to validate card funds" });
    }
  }
}

export const billingController = container.resolve(BillingController);
