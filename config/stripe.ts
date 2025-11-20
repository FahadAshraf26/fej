import Stripe from "stripe";

export const API_VERSION = "2025-04-30.basil";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder";

if (!process.env.STRIPE_SECRET_KEY && typeof process !== 'undefined') {
  console.warn(
    "⚠️  Stripe configuration is missing. Please set STRIPE_SECRET_KEY environment variable in Replit Secrets."
  );
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: API_VERSION,
});
