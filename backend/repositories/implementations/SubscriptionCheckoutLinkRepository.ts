import { injectable } from "tsyringe";
import { supabaseServer as supabase } from "@database/server.connection";
import { ISubscriptionCheckoutLinkRepository } from "@repositories/interfaces/ISubscriptionCheckoutLinkRepository";
import { TRIAL_DAYS } from "@Config/app-settings";

@injectable()
export class SubscriptionCheckoutLinkRepository implements ISubscriptionCheckoutLinkRepository {
  async create(data: {
    user_id: string;
    restaurant_id: string;
    plan_id: string;
    stripe_customer_id: string;
    original_checkout_url: string;
    expires_at: Date;
    trial_days?: number;
    trial_enabled?: boolean;
  }): Promise<{ id: string; error?: any }> {
    try {
      const { data: link, error } = await supabase
        .from("subscription_checkout_links")
        .insert({
          user_id: data.user_id,
          restaurant_id: data.restaurant_id,
          plan_id: data.plan_id,
          stripe_customer_id: data.stripe_customer_id,
          original_checkout_url: data.original_checkout_url,
          expires_at: data.expires_at,
          trial_days: data.trial_days ?? TRIAL_DAYS,
          trial_enabled: data.trial_enabled ?? true,
          status: "active",
        })
        .select("id")
        .single();

      if (error) throw error;
      return { id: link.id };
    } catch (error: any) {
      return { id: "", error };
    }
  }

  async getById(id: string): Promise<{ data: any; error?: any }> {
    try {
      const { data, error } = await supabase
        .from("subscription_checkout_links")
        .select(
          `
          *,
          profiles!inner(email, customer_name, phone),
          restaurants!inner(name),
          plans!inner(name, price, stripePriceId)
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      return { data };
    } catch (error: any) {
      return { data: null, error };
    }
  }

  async updateStatus(id: string, status: "active" | "expired" | "used"): Promise<{ error?: any }> {
    try {
      const { error } = await supabase
        .from("subscription_checkout_links")
        .update({
          status,
          updated_at: new Date(),
        })
        .eq("id", id);

      if (error) throw error;
      return {};
    } catch (error: any) {
      return { error };
    }
  }

  async update(data: {
    id: string;
    original_checkout_url?: string;
    expires_at?: Date;
    status?: "active" | "expired" | "used";
    updated_at?: Date;
  }): Promise<{ error?: any }> {
    try {
      const updateData: any = {};

      if (data.original_checkout_url !== undefined) {
        updateData.original_checkout_url = data.original_checkout_url;
      }
      if (data.expires_at !== undefined) {
        updateData.expires_at = data.expires_at;
      }
      if (data.status !== undefined) {
        updateData.status = data.status;
      }
      if (data.updated_at !== undefined) {
        updateData.updated_at = data.updated_at;
      } else {
        updateData.updated_at = new Date();
      }

      const { error } = await supabase
        .from("subscription_checkout_links")
        .update(updateData)
        .eq("id", data.id);

      if (error) throw error;
      return {};
    } catch (error: any) {
      return { error };
    }
  }

  async cleanupExpiredLinks(): Promise<{ error?: any }> {
    try {
      const { error } = await supabase
        .from("subscription_checkout_links")
        .update({
          status: "expired",
          updated_at: new Date(),
        })
        .lt("expires_at", new Date())
        .eq("status", "active");

      if (error) throw error;
      return {};
    } catch (error: any) {
      return { error };
    }
  }

  async getByUserAndPlan(userId: string, planId: string): Promise<{ data: any; error?: any }> {
    try {
      const { data, error } = await supabase
        .from("subscription_checkout_links")
        .select("*")
        .eq("user_id", userId)
        .eq("plan_id", planId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return { data };
    } catch (error: any) {
      return { data: null, error };
    }
  }

  async getByRestaurant(restaurantId: string): Promise<{ data: any[]; error?: any }> {
    try {
      const { data, error } = await supabase
        .from("subscription_checkout_links")
        .select(
          `
          *,
          profiles!inner (
            email
          ),
          plans!inner (
            name,
            price,
            currency
          )
        `
        )
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return { data: data || [] };
    } catch (error: any) {
      return { data: [], error };
    }
  }
}
