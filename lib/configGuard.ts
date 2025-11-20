import { hasSupabaseConfig } from "../supabase/client.connection";

export class ConfigMissingError extends Error {
  constructor(service: string) {
    super(`${service} configuration is missing. Please configure environment variables in Replit Secrets.`);
    this.name = "ConfigMissingError";
  }
}

export function requireSupabaseConfig(): void {
  if (!hasSupabaseConfig()) {
    throw new ConfigMissingError("Supabase");
  }
}

export function hasStripeConfig(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function requireStripeConfig(): void {
  if (!hasStripeConfig()) {
    throw new ConfigMissingError("Stripe");
  }
}
