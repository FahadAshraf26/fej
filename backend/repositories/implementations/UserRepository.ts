import { injectable } from "tsyringe";
import { supabaseServer as supabase } from "@database/server.connection";
import { IUserRepository, User } from "../interfaces/IUserRepository";
import { dispatchErrorEvent } from "@services/eventService";
import { v4 as uuid } from "uuid";

@injectable()
export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const { data: user, error } = await supabase.from("profiles").select("*").eq("id", id).single();

    if (error) {
      dispatchErrorEvent(`Failed to find user: ${error.message}`);
      throw error;
    }

    return user;
  }

  async findAll(): Promise<User[]> {
    const { data: users, error } = await supabase.from("profiles").select("*");

    if (error) {
      ``;
      dispatchErrorEvent(`Failed to find users: ${error.message}`);
      throw error;
    }

    return users || [];
  }

  async create(data: Partial<User>): Promise<User> {
    // Clean phone number - remove + prefix if present
    data.phone = data.phone ? data.phone.replace(/^\+/, "") : data.phone;

    // Check if user already exists in auth.users by email or phone
    let existingAuthUser = null;

    if (data.email) {
      existingAuthUser = await this.findAuthUserByIdentifier(data.email);
    }

    if (!existingAuthUser && data.phone) {
      existingAuthUser = await this.findAuthUserByIdentifier(data.phone);
    }

    let authUserId: string;

    if (existingAuthUser) {
      // User exists in auth.users - use their ID
      authUserId = existingAuthUser.id;
    } else {
      // User doesn't exist in auth.users - create new auth user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: data.email,
        email_confirm: true,
        user_metadata: { display_name: data.customer_name },
        phone: data.phone || undefined,
      });

      if (authError) {
        throw authError;
      }

      if (!authUser.user) {
        throw new Error("Auth user creation failed");
      }

      authUserId = authUser.user.id;
    }

    // Create or update profile
    const profileData = {
      id: authUserId,
      email: data.email,
      customer_name: data.customer_name,
      phone: data.phone || null,
      role: data.role || "user",
      showMenuChange: data.showMenuChange || false,
      stripe_customer_id: data.stripe_customer_id || null,
      subscriptionActive: data.subscriptionActive || false,
      restaurant_id: data.restaurant_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .upsert(profileData, { onConflict: "id" })
      .select()
      .single();

    if (profileError) {
      dispatchErrorEvent(`Failed to create/update profile: ${profileError.message}`);
      throw profileError;
    }

    return profile;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const { data: user, error } = await supabase
      .from("profiles")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      dispatchErrorEvent(`Failed to update user: ${error.message}`);
      throw error;
    }

    return user;
  }

  async delete(id: string): Promise<void> {
    // Delete from profiles table first
    const { error: profileError } = await supabase.from("profiles").delete().eq("id", id);

    if (profileError) {
      throw profileError;
    }

    // Delete from auth.users table
    const { error: authError } = await supabase.auth.admin.deleteUser(id);

    if (authError) {
      throw authError;
    }
  }

  async getByEmail(email: string): Promise<{ user: User | null; error: any }> {
    const { data: user, error } = await supabase
      .from("profiles")
      .select("*")
      .ilike("email", email)
      .single();

    return { user, error };
  }

  async getByCustomerId(customerId: string): Promise<{ user: User | null; error: any }> {
    const { data: user, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("stripe_customer_id", customerId)
      .single();

    return { user, error };
  }

  async updateUserCustomerId(email: string, customerId: string): Promise<void> {
    const { error } = await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .ilike("email", email);

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

  async updateRestaurantId(userId: string, restaurantId: string): Promise<void> {
    const { error } = await supabase
      .from("profiles")
      .update({ restaurant_id: restaurantId })
      .eq("id", userId);

    if (error) {
      dispatchErrorEvent(`Failed to update restaurant ID: ${error.message}`);
      throw error;
    }
  }

  async updateStripeCustomerId(userId: string, customerId: string): Promise<void> {
    const { error } = await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", userId);

    if (error) {
      dispatchErrorEvent(`Failed to update stripe customer ID: ${error.message}`);
      throw error;
    }
  }

  async findBy(identifier: string): Promise<{ user: User | null; error: any }> {
    // Check if identifier is a valid UUID
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      identifier
    );

    // Build query based on whether identifier is a valid UUID
    // Use case-insensitive queries for email and phone
    const query = isValidUUID
      ? `email.ilike.${identifier},phone.eq.${identifier},id.eq.${identifier},stripe_customer_id.eq.${identifier}`
      : `email.ilike.${identifier},phone.eq.${identifier},stripe_customer_id.eq.${identifier}`;

    const { data: user, error } = await supabase.from("profiles").select("*").or(query).single();

    return { user, error };
  }

  /**
   * Checks if a user exists in auth.users by email or phone using RPC function
   * @param identifier The email or phone to check
   * @returns The auth user if found, null otherwise
   */
  private async findAuthUserByIdentifier(identifier: string): Promise<any | null> {
    try {
      const { data: authUsers, error: authLookupError } = await supabase.rpc("get_auth_user", {
        identifier: identifier.toLowerCase(),
      });
      if (authLookupError) {
        throw authLookupError;
      }

      // Return the first user if found, null otherwise
      return authUsers && authUsers.length > 0 ? authUsers[0] : null;
    } catch (error) {
      throw error;
    }
  }
}
