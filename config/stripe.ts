import Stripe from "stripe";

export const API_VERSION = "2025-04-30.basil";

export function hasStripeConfig(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

function createStripeClient(): Stripe | null {
  if (!hasStripeConfig()) {
    return null;
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: API_VERSION,
  });
}

export const stripe = createStripeClient()!;
