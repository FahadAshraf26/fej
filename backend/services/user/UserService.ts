import { inject, injectable } from "tsyringe";
import { supabaseServer as supabase } from "@database/server.connection";
import { dispatchErrorEvent, dispatchInfoEvent } from "../eventService";
import type { IUserRepository } from "@repositories/interfaces/IUserRepository";
import { UserRepository } from "@repositories/implementations/UserRepository";

/**
 * Singleton service for managing user operations in Supabase
 */
@injectable()
export class UserService {
  constructor(@inject(UserRepository) private userRepository: IUserRepository) {}

  /**
   * Fetches a user profile by email
   * @param email The user's email
   * @returns The user profile or null if not found
   */
  public async getByEmail(email: string) {
    const { user, error } = await this.userRepository.getByEmail(email);
    if (error) {
      dispatchErrorEvent(`Failed to get user by email: ${error.message}`);
      throw error;
    }
    return user;
  }

  /**
   * Fetches a user profile by stripe customer ID
   * @param customerId The Stripe customer ID
   * @returns The user profile or null if not found
   */
  public async getByCustomerId(customerId: string) {
    const { user, error } = await this.userRepository.getByCustomerId(customerId);
    if (error) {
      dispatchErrorEvent(`Failed to get user by customer ID: ${error.message}`);
      throw error;
    }
    return user;
  }

  /**
   * Updates a user profile with a Stripe customer ID
   * @param email The user's email
   * @param customerId The Stripe customer ID
   */
  public async updateUserCustomerId(email: string, customerId: string) {
    try {
      await this.userRepository.updateUserCustomerId(email, customerId);
      dispatchInfoEvent(`Updated customer ID for user ${email}`);
    } catch (error: any) {
      dispatchErrorEvent(`Failed to update customer ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Updates a user's subscription status
   * @param customerId The Stripe customer ID
   * @param isActive Whether the subscription is active
   */
  public async updateSubscriptionStatus(customerId: string, isActive: boolean) {
    try {
      await this.userRepository.updateSubscriptionStatus(customerId, isActive);
      dispatchInfoEvent(`Updated subscription status for customer ${customerId}`);
    } catch (error: any) {
      dispatchErrorEvent(`Failed to update subscription status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Creates a new user in Supabase auth and database
   * @param email The user's email
   * @param name The user's name
   * @param phone The user's phone number
   * @param customerId The Stripe customer ID
   * @returns The created user profile
   */
  public async create(
    email: string,
    name: string,
    phone: string | null,
    customerId: string,
    role: string = "owner"
  ) {
    try {
      const user = await this.userRepository.create({
        email,
        customer_name: name,
        phone: phone || "",
        stripe_customer_id: customerId,
        role,
        subscriptionActive: false,
      });
      dispatchInfoEvent(`Created new user: ${email}`);
      return user;
    } catch (error: any) {
      dispatchErrorEvent(`Failed to create user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Creates a new user or updates existing user with restaurant association
   * @param email The user's email
   * @param phone The user's phone number
   * @param restaurantId The restaurant ID to associate
   * @param role The user's role
   * @returns The user profile
   */
  public async createOrUpdateUser(
    email: string,
    phone: string,
    restaurantId: string,
    role: string
  ) {
    try {
      // Check if user already exists
      const { user: existingUser, error: lookupError } = await this.userRepository.findBy(
        phone.replace(/\D/g, "")
      );

      if (lookupError && lookupError.code !== "PGRST116") {
        // PGRST116 is "not found" error
        throw lookupError;
      }

      if (existingUser) {
        // Check if user is already associated with a restaurant
        if (existingUser.restaurant_id) {
          throw new Error("User already associated with a restaurant");
        }

        // Update existing user with restaurant association
        const updatedUser = await this.userRepository.update(existingUser.id, {
          restaurant_id: restaurantId,
          role: role,
        });
        return updatedUser;
      }

      // Create new user
      const newUser = await this.userRepository.create({
        email,
        phone: phone.replace(/\D/g, ""),
        restaurant_id: restaurantId,
        role,
        customer_name: email.split("@")[0], // Use email prefix as default name
        showMenuChange: false,
      });

      return newUser;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Updates a user's profile with restaurant ID
   * @param userId The user ID
   * @param restaurantId The restaurant ID
   */
  public async updateRestaurantId(userId: string, restaurantId: string) {
    try {
      await this.userRepository.updateRestaurantId(userId, restaurantId);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Updates a user's role
   * @param userId The user ID
   * @param role The new role
   */
  public async updateRole(userId: string, role: string) {
    try {
      const user = await this.userRepository.update(userId, { role });
      return user;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Updates a user's profile
   * @param profileId The profile ID
   * @param data The data to update
   */
  public async update(id: string, data: any) {
    try {
      const user = await this.userRepository.update(id, data);
      return user;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Get paginated trial users with search functionality
   */
  public async getTrialUsers(
    page: number,
    pageSize: number,
    search: string
  ): Promise<{
    users: any[];
    totalPages: number;
    currentPage: number;
  }> {
    try {
      // First get the total count of trial users
      let query = supabase
        .from("profiles")
        .select(
          `
          *,
          subscriptions!inner (
            trial_activated,
            trial_end_date,
            trial_start_date,
            original_trial_end_date,
            trial_extended_count,
            trial_extended_days,
            status,
            stripe_subscription_id,
            restaurant_id,
            restaurants!inner (
              name
            )
          )
        `,
          { count: "exact" }
        )
        .neq("role", "flapjack")
        .eq("subscriptions.trial_activated", true)
        .gt("subscriptions.trial_end_date", new Date().toISOString())
        .eq("subscriptions.status", "trialing");

      if (search) {
        query = query.or(`email.ilike.%${search}%,customer_name.ilike.%${search}%`);
      }

      const {
        data: users,
        count,
        error,
      } = await query.range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;

      const totalPages = Math.ceil((count || 0) / pageSize);

      return {
        users: users || [],
        totalPages,
        currentPage: page,
      };
    } catch (error) {
      console.error("Error in getTrialUsers:", error);
      throw error;
    }
  }

  /**
   * Convert a trial user to a paid user
   */
  public async convertTrialToPaid(customerId: string): Promise<void> {
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("stripe_customer_id", customerId)
        .single();

      if (profileError) {
        throw new Error("Failed to find user profile");
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          subscriptionActive: true,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_customer_id", customerId);

      if (updateError) {
        throw new Error("Failed to update user profile");
      }

      dispatchInfoEvent(
        `Converted trial user ${profile?.customer_name}(${profile?.email}) to paid user`
      );
    } catch (error) {
      console.error("Error in convertTrialToPaid:", error);
      dispatchErrorEvent("Failed to convert trial user to paid user");
      throw error;
    }
  }

  /**
   * Delete a trial user
   */
  public async deleteTrialUser(customerId: string): Promise<void> {
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("stripe_customer_id", customerId)
        .single();

      if (profileError) {
        throw new Error("Failed to find user profile");
      }

      // Delete the user from Supabase Auth
      const { error: authError } = await supabase.auth.admin.deleteUser(profile.id);

      if (authError) {
        throw new Error("Failed to delete user from auth");
      }

      // Delete the profile from the database
      const { error: deleteError } = await supabase
        .from("profiles")
        .delete()
        .eq("stripe_customer_id", customerId);

      if (deleteError) {
        throw new Error("Failed to delete user profile");
      }

      // Dispatch event for notification
      dispatchInfoEvent(`Customer ${profile.customer_name}(${profile.email}) deleted trial user`);
    } catch (error) {
      console.error("Error deleting trial user:", error);
      dispatchErrorEvent("Failed to delete trial user");
      throw error;
    }
  }

  /**
   * Check if a user exists by email or phone
   */
  public async checkUserExists(email?: string, phone?: string) {
    try {
      if (!email && !phone) {
        throw new Error("Either email or phone must be provided");
      }

      let query = supabase.from("profiles").select("*");

      if (email) {
        query = query.ilike("email", email);
      }

      if (phone) {
        query = query.eq("phone", phone);
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === "PGRST116") {
          // No rows returned
          return { exists: false, user: null };
        }
        throw error;
      }

      return {
        exists: true,
        user: {
          id: data.id,
          email: data.email,
          phone: data.phone,
          customer_name: data.customer_name,
          restaurant_id: data.restaurant_id,
          stripe_customer_id: data.stripe_customer_id,
        },
      };
    } catch (error) {
      console.error("Error checking user existence:", error);
      throw error;
    }
  }

  async getProfileById(id: string) {
    const user = await this.userRepository.findBy(id);
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  async getProfilesByRestaurantId(restaurantId: string) {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("restaurant_id", restaurantId);

    if (error) {
      throw error;
    }

    return profiles;
  }

  async delete(id: string) {
    await this.userRepository.delete(id);
  }
}
