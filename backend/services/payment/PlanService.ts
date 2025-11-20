import { PlanTier, PLAN_TIERS } from "@Contants/plans";
import { PlanError } from "@errors/PlanError";
import { supabase } from "@database/client.connection";
import { IPlan } from "interfaces/IPlan";
import { injectable } from "tsyringe";

@injectable()
export class PlanService {
  constructor() {}
  private async handleSupabaseError(error: any, context: string) {
    console.error(`${context}:`, error);
    throw new PlanError(`Error ${context.toLowerCase()}: ${error.message}`);
  }

  async getPlansByTier(tier: PlanTier): Promise<IPlan[]> {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("isActive", true)
      .eq("features->tier", tier)
      .is("deletedAt", null);
    if (error) {
      await this.handleSupabaseError(error, "fetching plans by tier");
    }

    return data || [];
  }

  async getAllTieredPlans(): Promise<IPlan[]> {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("isActive", true)
      .neq("features->tier", null)
      .is("deletedAt", null)
      .order("price", { ascending: true });

    if (error) {
      await this.handleSupabaseError(error, "fetching tiered plans");
    }

    return data || [];
  }

  async getAllPlans(): Promise<IPlan[]> {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("isActive", true)
      .is("deletedAt", null)
      .order("price", { ascending: true });

    if (error) {
      await this.handleSupabaseError(error, "fetching all plans");
    }

    return data || [];
  }

  validateTier(tier: any): asserts tier is PlanTier {
    if (!tier || typeof tier !== "string" || !PLAN_TIERS.includes(tier as PlanTier)) {
      throw new PlanError("Invalid plan tier", 400);
    }
  }

  async getPlanByPriceOrPriceId(price: number | string, priceId: string): Promise<IPlan> {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .or(`price.eq.${price},stripePriceId.eq.${priceId}`)
      .is("deletedAt", null);
    if (error) {
      await this.handleSupabaseError(error, "fetching plan by price or price id");
    }
    return data?.[0];
  }
}
