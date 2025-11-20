import { stripe } from "@Config/stripe";
import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { container } from "tsyringe";
import { PaymentProviderService } from "@services/payment/PaymentProviderService";

// Types for better type safety
interface InvoiceResponse {
  invoiceUrl: string | null;
  invoiceId: string | null;
}

interface ErrorResponse {
  error: string;
  subscription?: string;
  success?: boolean;
}

// Utility functions for better organization
class StripeSubscriptionHandler {
  /**
   * Retrieves and validates the default payment method for a customer
   */
  private static async getOrSetDefaultPaymentMethod(
    subscription: Stripe.Subscription
  ): Promise<Stripe.PaymentMethod> {
    let paymentMethod = subscription.default_payment_method;

    if (!paymentMethod) {
      const customerId = subscription.customer as string;
      const stripeCustomer = (await stripe.customers.retrieve(customerId)) as Stripe.Customer;
      const defaultPaymentMethodId = stripeCustomer.invoice_settings
        .default_payment_method as string;

      if (!defaultPaymentMethodId) {
        throw new Error("No default payment method found for customer");
      }

      paymentMethod = await stripe.paymentMethods.retrieve(defaultPaymentMethodId);

      // Update subscription with the payment method
      await stripe.subscriptions.update(subscription.id, {
        default_payment_method: defaultPaymentMethodId,
      });
    }

    return typeof paymentMethod === "string"
      ? await stripe.paymentMethods.retrieve(paymentMethod)
      : paymentMethod;
  }

  static async updateSubscription(subscription: string, pauseCollection: boolean) {
    return await stripe.subscriptions.update(subscription, {
      pause_collection: pauseCollection ? { behavior: "void" } : null,
    });
  }

  /**
   * Processes a trialing subscription for card validation
   */
  private static async processTrialingSubscription(
    subscription: Stripe.Subscription
  ): Promise<void> {
    const subscriptionItem = subscription.items.data[0];

    if (!subscriptionItem?.price) {
      throw new Error("No pricing information found in subscription");
    }

    const { unit_amount: amount, currency } = subscriptionItem.price;
    const customer = subscription.customer;

    // Validate required fields
    if (!amount || !currency || !customer) {
      throw new Error("Missing required subscription data for payment verification");
    }

    const paymentMethod = await this.getOrSetDefaultPaymentMethod(subscription);
    
    // Use the shared PaymentProviderService implementation
    const paymentProvider = container.resolve(PaymentProviderService);
    await paymentProvider.validateCardFunds(amount, currency, customer, paymentMethod);
  }

  /**
   * Processes subscription based on its status
   */
  public static async processSubscription(subscriptionId: string): Promise<void> {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    if (subscription.status === "trialing") {
      await this.processTrialingSubscription(subscription);
    }
  }
}

/**
 * Main API handler
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<InvoiceResponse | ErrorResponse>
) {
  // Method validation
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Parameter validation
  const { session_id } = req.query;
  if (!session_id || typeof session_id !== "string") {
    return res.status(400).json({ error: "Valid session ID is required" });
  }

  try {
    // Retrieve checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["invoice"],
    });

    if (!session.subscription) {
      return res.status(404).json({ error: "No subscription found for this session" });
    }

    // Process subscription if it's a string (subscription ID)
    if (typeof session.subscription === "string") {
      try {
        await StripeSubscriptionHandler.processSubscription(session.subscription);
        await StripeSubscriptionHandler.updateSubscription(session.subscription, false);
      } catch (validationError: any) {
        await StripeSubscriptionHandler.updateSubscription(session.subscription, true);
        console.error("Subscription processing failed:", validationError);

        // Check if the error is payment-related and format the message accordingly
        let errorMessage = validationError.message || "Card validation failed";

        if (
          validationError.message &&
          (validationError.message.toLowerCase().includes("card was declined") ||
            validationError.message.toLowerCase().includes("insufficient funds") ||
            validationError.message.toLowerCase().includes("payment") ||
            validationError.message.toLowerCase().includes("declined"))
        ) {
          // Get the subscription to extract the amount
          try {
            const subscription = await stripe.subscriptions.retrieve(session.subscription);
            const subscriptionItem = subscription.items.data[0];
            const amount = subscriptionItem?.price?.unit_amount;
            const currency = subscriptionItem?.price?.currency;

            if (amount && currency) {
              const formattedAmount = (amount / 100).toFixed(2); // Convert cents to dollars
              errorMessage = `Card declined for $${formattedAmount} test hold — please try another card`;
            }
          } catch (retrieveError) {
            // If we can't retrieve the subscription, use the original error message
            console.error("Failed to retrieve subscription for error formatting:", retrieveError);
          }
        }

        return res.status(400).json({
          success: false,
          error: errorMessage,
          subscription: session.subscription,
        });
      }
    }

    // Extract invoice information
    const invoiceUrl =
      session.invoice && typeof session.invoice === "object"
        ? (session.invoice as any).hosted_invoice_url || null
        : null;

    const invoiceId =
      session.invoice && typeof session.invoice === "object"
        ? (session.invoice as any).id || null
        : null;

    return res.status(200).json({ invoiceUrl, invoiceId });
  } catch (error: any) {
    console.error("Error in stripe handler:", error);

    // Handle Stripe-specific errors
    const errorMessage = error.raw?.message || error.message || "Failed to process request";

    return res.status(500).json({
      error: errorMessage,
      subscription: typeof error.subscription === "string" ? error.subscription : undefined,
    });
  }
}
