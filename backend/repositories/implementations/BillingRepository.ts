import { injectable } from "tsyringe";
import { supabaseServer as supabase } from "@database/server.connection";
import {
  IBillingRepository,
  Billing,
  SubscriptionData,
  SubscriptionHistoryData,
} from "../interfaces/IBillingRepository";
import { dispatchErrorEvent } from "@services/eventService";

@injectable()
export class BillingRepository implements IBillingRepository {
  async findById(id: string): Promise<Billing | null> {
    const { data: billing, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      dispatchErrorEvent(`Failed to find billing: ${error.message}`);
      throw error;
    }

    return billing;
  }

  async findAll(): Promise<Billing[]> {
    const { data: billings, error } = await supabase.from("subscriptions").select("*");

    if (error) {
      dispatchErrorEvent(`Failed to find billings: ${error.message}`);
      throw error;
    }

    return billings || [];
  }

  async create(data: Partial<Billing>): Promise<Billing> {
    const { data: billing, error } = await supabase
      .from("subscriptions")
      .insert([data])
      .select()
      .single();

    if (error) {
      dispatchErrorEvent(`Failed to create billing: ${error.message}`);
      throw error;
    }

    return billing;
  }

  async update(id: string, data: Partial<Billing>): Promise<Billing> {
    const { data: billing, error } = await supabase
      .from("subscriptions")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      dispatchErrorEvent(`Failed to update billing: ${error.message}`);
      throw error;
    }

    return billing;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("subscriptions").delete().eq("id", id);

    if (error) {
      dispatchErrorEvent(`Failed to delete billing: ${error.message}`);
      throw error;
    }
  }

  async getByCustomerId(customerId: string): Promise<{ billing: Billing | null; error: any }> {
    const { data: billing, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("customer_id", customerId)
      .single();

    return { billing, error };
  }

  async getBySubscriptionId(
    subscriptionId: string
  ): Promise<{ billing: Billing | null; error: any }> {
    const { data: billing, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("stripe_subscription_id", subscriptionId)
      .single();

    return { billing, error };
  }

  async updateTrialDates(
    subscriptionId: string,
    trialEndDate: Date,
    extendedCount: number,
    extendedDays: number
  ): Promise<void> {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        trial_end_date: trialEndDate.toISOString(),
        trial_extended_count: extendedCount,
        trial_extended_days: extendedDays,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscriptionId);

    if (error) {
      dispatchErrorEvent(`Failed to update trial dates: ${error.message}`);
      throw error;
    }
  }

  async updateSubscriptionStatus(subscriptionId: string, status: string): Promise<void> {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("subscription_id", subscriptionId);

    if (error) {
      dispatchErrorEvent(`Failed to update subscription status: ${error.message}`);
      throw error;
    }
  }

  async updatePriceId(subscriptionId: string, priceId: string): Promise<void> {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        price_id: priceId,
        updated_at: new Date().toISOString(),
      })
      .eq("subscription_id", subscriptionId);

    if (error) {
      dispatchErrorEvent(`Failed to update price ID: ${error.message}`);
      throw error;
    }
  }

  async getPlanByPriceId(priceId: string): Promise<{ data: any; error: any }> {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("stripe_price_id", priceId)
      .single();

    return { data, error };
  }

  async getSubscriptionWithCustomer(subscriptionId: string): Promise<{
    data: {
      profiles: {
        stripe_customer_id: string;
      };
    } | null;
    error: any;
  }> {
    const { data, error } = await supabase
      .from("subscriptions")
      .select(
        `
        profiles (
          stripe_customer_id
        )
      `
      )
      .eq(subscriptionId.includes("sub_") ? "stripe_subscription_id" : "id", subscriptionId)
      .single();

    return {
      // @ts-ignore
      data: data ? { profiles: data.profiles } : null,
      error,
    };
  }

  async upsertSubscription(data: SubscriptionData): Promise<{ data: any; error: any }> {
    const { data: result, error } = await supabase
      .from("subscriptions")
      .upsert(data)
      .select()
      .single();

    if (error) {
      dispatchErrorEvent(`Failed to upsert subscription: ${error.message}`);
    }

    return { data: result, error };
  }

  async recordSubscriptionHistory(data: SubscriptionHistoryData): Promise<void> {
    const { error } = await supabase.from("subscription_history").insert(data);

    if (error) {
      dispatchErrorEvent(`Failed to record subscription history: ${error.message}`);
      throw error;
    }
  }

  async getActiveSubscriptionsForUser(userId: string): Promise<any[]> {
    const { data: subscriptions, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("profile_id", userId)
      .eq("is_active", true);

    if (error) {
      dispatchErrorEvent(`Failed to get active subscriptions: ${error.message}`);
      throw error;
    }

    return subscriptions || [];
  }

  async updateUserSubscriptionStatus(userId: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from("profiles")
      .update({ subscriptionActive: isActive })
      .eq("id", userId);

    if (error) {
      dispatchErrorEvent(`Failed to update user subscription status: ${error.message}`);
      throw error;
    }
  }

  async getOrCreateSubscription(
    subscriptionId: string,
    data: SubscriptionData
  ): Promise<{ data: any; error: any }> {
    // First try to get existing subscription
    const { data: existingSub, error: getError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("stripe_subscription_id", subscriptionId)
      .single();

    if (getError && getError.code !== "PGRST116") {
      // If error is not "no rows found", return the error
      return { data: null, error: getError };
    }

    if (existingSub) {
      // If subscription exists, update it
      const { data: updatedSub, error: updateError } = await supabase
        .from("subscriptions")
        .update(data)
        .eq("stripe_subscription_id", subscriptionId)
        .select()
        .single();

      return { data: updatedSub, error: updateError };
    } else {
      // If subscription doesn't exist, create it
      const { data: newSub, error: createError } = await supabase
        .from("subscriptions")
        .insert([{ ...data, stripe_subscription_id: subscriptionId }])
        .select()
        .single();

      return { data: newSub, error: createError };
    }
  }

  async cancelSubscriptionWithReason(
    subscriptionId: string,
    reason: string
  ): Promise<{ data: any; error: any }> {
    const { data, error } = await supabase
      .from("subscriptions")
      .update({
        comment: reason,
        updated_at: new Date(),
      })
      .eq("stripe_subscription_id", subscriptionId)
      .select()
      .single();

    if (error) {
      dispatchErrorEvent(`Failed to cancel subscription: ${error.message}`);
    }

    return { data, error };
  }

  /**
   * Undoes a subscription cancellation
   */
  async undoSubscriptionCancellation(subscriptionId: string): Promise<{ data: any; error: any }> {
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .update({
          status: "active",
          comment: null, // Clear the cancellation reason
          cancel_at: null,
          canceled_at: null,
        })
        .eq("stripe_subscription_id", subscriptionId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error("Error undoing subscription cancellation:", error);
      return { data: null, error };
    }
  }
}
