import Stripe from "stripe";

export const API_VERSION = "2025-04-30.basil";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: API_VERSION,
});
