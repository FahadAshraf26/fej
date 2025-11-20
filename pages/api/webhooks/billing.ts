import { NextApiRequest, NextApiResponse } from "next";
import { createApiHandler } from "@utils/createApiHandler";
import { container } from "tsyringe";
import { BillingService } from "@services/payment/BillingService";
import Stripe from "stripe";
import { dispatchErrorEvent, dispatchInvoiceEvent } from "@services/eventService";
import { stripe, API_VERSION } from "@Config/stripe";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRequestBody(request: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", (err) => reject(err));
  });
}

export default createApiHandler({
  POST: async (req: NextApiRequest, res: NextApiResponse) => {
    const billingService = container.resolve(BillingService);
    let event: Stripe.Event;
    const buf: any = await readRequestBody(req);

    try {
      const signature = req.headers["stripe-signature"];

      event = stripe.webhooks.constructEvent(
        buf,
        signature as string,
        process.env.STRIPE_WEBHOOK_SECRET!
      );

      // Verify API version matches
      if (event.api_version !== API_VERSION) {
        return res
          .status(200)
          .send(`Webhook API version mismatch: expected ${API_VERSION}, got ${event.api_version}`);
      }
    } catch (err: any) {
      dispatchErrorEvent(`Webhook Error: ${err.message}`, {
        signature: req.headers["stripe-signature"],
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? "Set" : "Not Set",
      });
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    switch (event.type) {
      case "payment_intent.amount_capturable_updated":
        await billingService.handlePaymentIntentUpdate(event.data.object as Stripe.PaymentIntent);
        break;

      case "payment_intent.payment_failed":
        await billingService.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;

      case "customer.created":
        await billingService.handleNewCustomer(event.data.object as Stripe.Customer);
        break;

      case "customer.updated":
        await billingService.handleCustomerUpdated(event.data.object as Stripe.Customer);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await billingService.handleSubscription(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await billingService.handleSubscriptionCancellation(
          event.data.object as Stripe.Subscription
        );
        break;
      case "subscription_schedule.updated":
        await billingService.handleScheduledSubscriptionCancellation(
          event.data.object as Stripe.SubscriptionSchedule
        );
        break;

      case "invoice.payment_succeeded":
        const invoice = event.data.object as Stripe.Invoice;
        await billingService.handleInvoicePayment(invoice);
        break;

      case "invoice.payment_failed":
        await billingService.handleInvoiceFailure(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return res.json({ received: true });
  },
});
