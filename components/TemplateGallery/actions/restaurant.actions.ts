import { IRestaurantDetail } from "../../../interfaces/IRestaurantDetail";
import { Location } from "../../../interfaces/IRestaurantList";

/**
 * Client for the Restaurants API
 */
export const restaurantActions = {
  /**
   * Get all restaurants (filtered by user role)
   */
  async getRestaurants(user: any): Promise<IRestaurantDetail[]> {
    const response = await fetch("/api/restaurants", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch restaurants");
    }

    return response.json();
  },

  /**
   * Get locations for a restaurant
   */
  async getRestaurantLocations(restaurantId: string): Promise<Location[]> {
    const response = await fetch(
      `/api/restaurants/locations?restaurantId=${restaurantId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch restaurant locations");
    }

    return response.json();
  },

  /**
   * Delete a restaurant
   */
  async deleteRestaurant(restaurantId: string): Promise<void> {
    const response = await fetch(
      `/api/restaurants?restaurantId=${restaurantId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete restaurant");
    }
  },

  /**
   * Get restaurant statistics
   */
  async getRestaurantStats(
    restaurantId: string
  ): Promise<{ menuCount: number; userCount: number }> {
    const response = await fetch(
      `/api/restaurants/stats?restaurantId=${restaurantId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch restaurant stats");
    }

    return response.json();
  },
};
