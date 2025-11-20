import { injectable, inject } from "tsyringe";
import { supabaseServer as supabase } from "@database/server.connection";
import { dispatchErrorEvent, dispatchInfoEvent } from "../eventService";
import { IRestaurantDetail } from "../../../interfaces/IRestaurantDetail";
import { Location } from "../../../interfaces/IRestaurantList";
import type {
  IRestaurantRepository,
  Restaurant,
} from "@repositories/interfaces/IRestaurantRepository";
import { RestaurantRepository } from "@repositories/implementations/RestaurantRepository";
import { APP_CONFIG } from "@Contants/app";
/**
 * Singleton service for managing restaurant operations in Supabase
 */
@injectable()
export class RestaurantService {
  constructor(@inject(RestaurantRepository) private restaurantRepository: IRestaurantRepository) {}

  /**
   * Fetches a restaurant by owner ID
   * @param ownerId The owner's user ID
   * @returns The restaurant or null if not found
   */
  public async getByOwnerId(ownerId: string) {
    try {
      const { restaurant, error } = await this.restaurantRepository.getByOwnerId(ownerId);
      if (error) throw error;
      return restaurant;
    } catch (error: any) {
      dispatchErrorEvent(`Failed to get restaurant by owner ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetches a restaurant by name
   * @param name The restaurant name
   * @returns The restaurant or null if not found
   */
  public async getByName(name: string) {
    try {
      const { restaurant, error } = await this.restaurantRepository.getByName(name);
      if (error) throw error;
      return restaurant;
    } catch (error: any) {
      dispatchErrorEvent(`Failed to get restaurant by name: ${error.message}`);
      throw error;
    }
  }

  /**
   * Updates a restaurant's owner
   * @param restaurantId The restaurant ID
   * @param ownerId The new owner's user ID
   */
  public async updateOwnerId(restaurantId: string, ownerId: string) {
    try {
      await this.restaurantRepository.updateOwnerId(restaurantId, ownerId);
      dispatchInfoEvent(`Updated owner for restaurant ${restaurantId}`);
    } catch (error: any) {
      dispatchErrorEvent(`Failed to update restaurant owner: ${error.message}`);
      throw error;
    }
  }

  /**
   * Updates a restaurant's logo
   * @param restaurantId The restaurant ID
   * @param logoUrl The new logo URL
   */
  public async updateLogo(restaurantId: string, logoUrl: string) {
    try {
      await this.restaurantRepository.updateLogo(restaurantId, logoUrl);
      dispatchInfoEvent(`Updated logo for restaurant ${restaurantId}`);
    } catch (error: any) {
      dispatchErrorEvent(`Failed to update restaurant logo: ${error.message}`);
      throw error;
    }
  }

  /**
   * Creates a new restaurant
   * @param name The restaurant name
   * @param ownerId The owner's user ID
   * @param description Optional description
   * @returns The created restaurant
   */
  public async create(name: string, ownerId: string, description?: string) {
    try {
      const restaurant = await this.restaurantRepository.create({
        name,
        owner_id: ownerId,
        address: description || name,
      });
      dispatchInfoEvent(`Created new restaurant: ${name}`);
      return restaurant;
    } catch (error: any) {
      dispatchErrorEvent(`Failed to create restaurant: ${error.message}`);
      throw error;
    }
  }

  /**
   * Updates a restaurant
   * @param id The restaurant ID
   * @param data The data to update
   * @returns The updated restaurant
   */
  public async update(id: string, data: any) {
    try {
      const restaurant = await this.restaurantRepository.update(id, data);
      dispatchInfoEvent(`Updated restaurant: ${restaurant.name}`);
      return restaurant;
    } catch (error: any) {
      dispatchErrorEvent(`Failed to update restaurant: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deletes a restaurant and all its associated data
   * @param id The restaurant ID
   */
  public async delete(id: string) {
    try {
      // First get the restaurant to ensure it exists
      const restaurant = await this.restaurantRepository.findById(id);
      if (!restaurant) {
        throw new Error("Restaurant not found");
      }

      // Delete all associated data in a transaction
      // const { error: transactionError } = await supabase.rpc("delete_restaurant_data", {
      //   restaurant_id: id,
      // });

      // if (transactionError) {
      //   throw transactionError;
      // }

      // // Finally delete the restaurant
      await this.restaurantRepository.delete(id);
      dispatchInfoEvent(`Deleted restaurant and all associated data: ${id}`);
    } catch (error: any) {
      dispatchErrorEvent(`Failed to delete restaurant: ${error.message}`);
      throw error;
    }
  }

  /**
   * Creates or fetches a restaurant by name
   * @param name The restaurant name
   * @param ownerId The owner's user ID
   * @returns The restaurant ID
   */
  public async createOrGet(name: string, ownerId: string) {
    try {
      // Check if restaurant exists
      const restaurant = await this.getByName(name);

      if (restaurant) {
        // Restaurant exists, check if it needs an owner update
        if (!restaurant.owner_id) {
          await this.updateOwnerId(restaurant.id, ownerId);
        }
        return restaurant.id;
      } else {
        // Create new restaurant
        const newRestaurant = await this.create(name, ownerId);
        return newRestaurant.id;
      }
    } catch (error: any) {
      dispatchErrorEvent(`Failed to create or get restaurant: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetches all restaurants with basic filtering
   */
  async getRestaurants(user: any): Promise<IRestaurantDetail[]> {
    try {
      if (!user) {
        throw new Error("User is required to fetch restaurants");
      }

      // Different query based on user role
      let restaurantsQuery;
      if (user.role === "flapjack") {
        // Flapjack users can see all restaurants
        restaurantsQuery = await supabase.rpc("get_restaurant_subscriptions");
      } else {
        // Regular users can only see their assigned restaurant
        restaurantsQuery = supabase.rpc("get_restaurant_subscriptions", {
          restaurant_id: user.restaurant_id,
        });
      }
      const { data: restaurants, error } = await restaurantsQuery;

      if (error) throw error;
      // Map to expected format
      const reseturantOptions = restaurants.map((restaurant: any) => {
        return {
          label: restaurant?.name,
          value: restaurant?.id?.toString(),
          location: restaurant?.locations,
          isAutoLayout: restaurant?.isAutoLayout,
          subscriptionStatus: restaurant?.subscription_status || "Unknown",
        };
      });
      let flapjackRestaurant;
      let otherRestaurants: any = [];
      reseturantOptions.forEach((restaurant: any) => {
        if (restaurant?.value === "2") {
          flapjackRestaurant = restaurant;
        } else {
          otherRestaurants.push(restaurant);
        }
      });
      return [flapjackRestaurant, ...otherRestaurants].filter(Boolean);
    } catch (err) {
      console.error("Error fetching restaurants:", err);
      throw err;
    }
  }

  /**
   * Fetches locations for a specific restaurant
   */
  async getRestaurantLocations(restaurantId: string): Promise<Location[]> {
    try {
      if (!restaurantId) {
        throw new Error("Restaurant ID is required to fetch locations");
      }

      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("restaurantId", restaurantId)
        .order("name");

      if (error) throw error;

      // If no locations, add a default one
      if (!data || data.length === 0) {
        return [
          {
            id: APP_CONFIG.LOCATION.REPLACEMENT,
            name: "Other Menus",
            restaurantId: parseInt(restaurantId, 10),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
          },
        ];
      }

      // Add the default "Other Menus" location
      return data;
    } catch (err) {
      console.error("Error fetching restaurant locations:", err);
      throw err;
    }
  }

  /**
   * Gets restaurant statistics
   */
  async getRestaurantStats(
    restaurantId: string
  ): Promise<{ menuCount: number; userCount: number }> {
    try {
      // Get menu count
      const {
        data: menus,
        error: menuError,
        count: menuCount,
      } = await supabase
        .from("templates")
        .select("*", { count: "exact" })
        .eq("restaurant_id", restaurantId);

      if (menuError) throw menuError;

      // Get user count
      const {
        data: users,
        error: userError,
        count: userCount,
      } = await supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .eq("restaurant_id", restaurantId);

      if (userError) throw userError;

      return {
        menuCount: menuCount || menus?.length || 0,
        userCount: userCount || users?.length || 0,
      };
    } catch (err) {
      console.error("Error fetching restaurant stats:", err);
      throw err;
    }
  }

  /**
   * Get restaurant details by ID
   */
  public async getRestaurantById(restaurantId: string) {
    try {
      const restaurant = await this.restaurantRepository.findById(restaurantId);
      if (!restaurant) {
        return { restaurant: null, error: "Restaurant not found" };
      }
      return { restaurant, error: null };
    } catch (error: any) {
      console.error("Error fetching restaurant:", error);
      dispatchErrorEvent("Failed to fetch restaurant details");
      throw error;
    }
  }
}
