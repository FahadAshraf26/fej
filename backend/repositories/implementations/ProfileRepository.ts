import { injectable } from "tsyringe";
import { supabaseServer as supabase } from "@database/server.connection";
import { IProfileRepository, Profile } from "../interfaces/IProfileRepository";
import { dispatchErrorEvent } from "@services/eventService";

@injectable()
export class ProfileRepository implements IProfileRepository {
  async findById(id: string): Promise<Profile | null> {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      dispatchErrorEvent(`Failed to find profile: ${error.message}`);
      throw error;
    }

    return profile;
  }

  async findAll(): Promise<Profile[]> {
    const { data: profiles, error } = await supabase.from("profiles").select("*");

    if (error) {
      dispatchErrorEvent(`Failed to find profiles: ${error.message}`);
      throw error;
    }

    return profiles || [];
  }

  async create(data: Partial<Profile>): Promise<Profile> {
    const { data: profile, error } = await supabase
      .from("profiles")
      .insert([data])
      .select()
      .single();

    if (error) {
      dispatchErrorEvent(`Failed to create profile: ${error.message}`);
      throw error;
    }

    return profile;
  }

  async update(id: string, data: Partial<Profile>): Promise<Profile> {
    const { data: profile, error } = await supabase
      .from("profiles")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      dispatchErrorEvent(`Failed to update profile: ${error.message}`);
      throw error;
    }

    return profile;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("profiles").delete().eq("id", id);

    if (error) {
      dispatchErrorEvent(`Failed to delete profile: ${error.message}`);
      throw error;
    }
  }

  async getByEmail(email: string): Promise<{ profile: Profile | null; error: any }> {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .single();

    return { profile, error };
  }

  async getByCustomerId(customerId: string): Promise<{ profile: Profile | null; error: any }> {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("stripe_customer_id", customerId)
      .single();

    return { profile, error };
  }

  async updateUserCustomerId(email: string, customerId: string): Promise<void> {
    const { error } = await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("email", email);

    if (error) {
      dispatchErrorEvent(`Failed to update customer ID: ${error.message}`);
      throw error;
    }
  }

  async updateSubscriptionStatus(customerId: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from("profiles")
      .update({ subscriptionActive: isActive })
      .eq("stripe_customer_id", customerId);

    if (error) {
      dispatchErrorEvent(`Failed to update subscription status: ${error.message}`);
      throw error;
    }
  }

  async updateRestaurantId(profileId: string, restaurantId: string): Promise<void> {
    const { error } = await supabase
      .from("profiles")
      .update({ restaurant_id: restaurantId })
      .eq("id", profileId);

    if (error) {
      dispatchErrorEvent(`Failed to update restaurant ID: ${error.message}`);
      throw error;
    }
  }
}
