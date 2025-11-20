// pages/api/restaurants/index.ts
import { restaurantController } from "@controllers/RestaurantController";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Route based on HTTP method
  switch (req.method) {
    case "POST":
      // Get restaurants list
      return restaurantController.getRestaurants(req, res);

    case "DELETE":
      // Delete restaurant
      return restaurantController.deleteRestaurant(req, res);

    default:
      return res.status(405).json({ error: "Method not allowed" });
  }
}
