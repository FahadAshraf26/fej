import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { sendMessage } from "@services/slackService";
import { supabase } from "@database/client.connection";
import { TRIAL_DAYS } from "@Config/app-settings";

class StripeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeError";
  }
}

const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY!, {
  // @ts-ignore
  apiVersion: "2022-11-15",
});

const createPaymentIntent = async (plan: any, customerId: string) => {
  try {
    return stripe.paymentIntents.create({
      amount: plan.price,
      currency: "usd",
      customer: customerId,
      setup_future_usage: "off_session",
      metadata: {
        trialDays: plan.trialDays ?? TRIAL_DAYS,
      },
      payment_method_types: ["card"],
      capture_method: "manual",
      payment_method_options: {
        card: {
          setup_future_usage: "off_session",
        },
      },
    });
  } catch (error: any) {
    sendMessage(`Payment intent creation error: ${error.message}`);
    throw new StripeError(`Failed to create payment intent: ${error.message}`);
  }
};

const createCustomerAndPaymentIntent = async (
  email: string,
  name: string,
  plan: any,
  restaurantName: string,
  phoneNumber: any
) => {
  try {
    const customer =
      (await stripe.customers
        .search({
          query: `email:"${email}"`,
          limit: 1,
        })
        .then((result) => result.data[0])) ||
      (await stripe.customers.create({
        email,
        name,
        phone: phoneNumber,
        metadata: {
          restaurantName,
          phoneNumber,
        },
      }));

    const paymentIntent = await createPaymentIntent(plan, customer.id);
    if (!paymentIntent?.client_secret) {
      throw new StripeError("Failed to initialize payment");
    }

    return paymentIntent.client_secret;
  } catch (error: any) {
    sendMessage(`Stripe operation error: ${error.message}`);
    throw new StripeError(`Payment setup failed: ${error.message}`);
  }
};

const handlePaymentSetup = async (
  email: string,
  name: string,
  plan: any,
  restaurantName: string,
  phoneNumber: any
) => {
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", email.toLowerCase())
    .single();
  if (profile != null) {
    if (profile.subscriptionActive) {
      throw new StripeError("This account already has an active subscription");
    }

    if (profile.stripe_customer_id) {
      const paymentIntent = await createPaymentIntent(plan, profile.stripe_customer_id);
      return paymentIntent.client_secret;
    }
  } else {
    return createCustomerAndPaymentIntent(email, name, plan, restaurantName, phoneNumber);
  }
};

const handlePostRequest = async (request: NextApiRequest, res: NextApiResponse) => {
  const { email, name, restaurantName, phoneNumber, plan } = JSON.parse(request.body);
  try {
    const clientSecret = await handlePaymentSetup(email, name, plan, restaurantName, phoneNumber);
    res.status(200).json({ clientSecret });
  } catch (error: any) {
    sendMessage(`Payment processing error: ${error.message}`);
    const status = error.name === "StripeError" ? 400 : 500;
    res.status(status).json({ message: error.message });
  }
};

export default async function controller(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  await handlePostRequest(req, res);
}
