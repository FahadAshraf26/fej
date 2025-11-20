// backend/controllers/RestaurantController.ts
import { NextApiRequest, NextApiResponse } from "next";
import { validateRequest } from "../utils/validation";
import {
  getUserRestaurantsSchema,
  getRestaurantLocationsSchema,
  deleteRestaurantSchema,
  getRestaurantStatsSchema,
} from "../schemas/restaurant.schema";
import { container, injectable } from "tsyringe";
import { RestaurantService } from "../services/restaurant/RestaurantService";

@injectable()
export class RestaurantController {
  constructor(private restaurantService: RestaurantService) {}

  /**
   * Get all restaurants (filtered by user role)
   */
  async getRestaurants(req: NextApiRequest, res: NextApiResponse) {
    try {
      const validation = await validateRequest(
        getUserRestaurantsSchema,
        req,
        res
      );

      if (!validation.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validation.error?.format(),
        });
      }

      const { user } = validation.data!;
      const restaurants = await this.restaurantService.getRestaurants(user);
      return res.status(200).json(restaurants);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      return res.status(500).json({ error: "Failed to fetch restaurants" });
    }
  }

  /**
   * Get locations for a restaurant
   */
  async getRestaurantLocations(req: NextApiRequest, res: NextApiResponse) {
    try {
      const validation = await validateRequest(
        getRestaurantLocationsSchema,
        req,
        res,
        "query"
      );

      if (!validation.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validation.error?.format(),
        });
      }

      const { restaurantId } = validation.data!;
      const locations = await this.restaurantService.getRestaurantLocations(
        restaurantId
      );
      return res.status(200).json(locations);
    } catch (error) {
      console.error("Error fetching restaurant locations:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch restaurant locations" });
    }
  }

  /**
   * Delete a restaurant
   */
  async deleteRestaurant(req: NextApiRequest, res: NextApiResponse) {
    try {
      const validation = await validateRequest(
        deleteRestaurantSchema,
        req,
        res,
        "query"
      );

      if (!validation.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validation.error?.format(),
        });
      }

      const { restaurantId } = validation.data!;
      await this.restaurantService.delete(restaurantId);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting restaurant:", error);
      return res.status(500).json({ error: "Failed to delete restaurant" });
    }
  }

  /**
   * Get restaurant statistics
   */
  async getRestaurantStats(req: NextApiRequest, res: NextApiResponse) {
    try {
      const validation = await validateRequest(
        getRestaurantStatsSchema,
        req,
        res,
        "query"
      );

      if (!validation.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validation.error?.format(),
        });
      }

      const { restaurantId } = validation.data!;
      const stats = await this.restaurantService.getRestaurantStats(
        restaurantId
      );
      return res.status(200).json(stats);
    } catch (error) {
      console.error("Error fetching restaurant stats:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch restaurant statistics" });
    }
  }

  /**
   * Get restaurant details by ID
   */
  public async getRestaurantById(req: NextApiRequest, res: NextApiResponse) {
    try {
      const { id } = req.query;

      if (!id || typeof id !== "string") {
        return res.status(400).json({
          message: "Restaurant ID is required",
        });
      }

      const { restaurant, error } =
        await this.restaurantService.getRestaurantById(id);

      if (error) {
        return res.status(404).json({ message: error });
      }

      return res.status(200).json({ restaurant });
    } catch (error) {
      console.error("Error fetching restaurant:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

export const restaurantController = container.resolve(RestaurantController);
