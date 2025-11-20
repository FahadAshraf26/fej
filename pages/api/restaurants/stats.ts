// pages/api/restaurants/stats.js

import { NextApiRequest, NextApiResponse } from "next";
import { restaurantController } from "@controllers/RestaurantController";
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Get restaurant statistics
  return restaurantController.getRestaurantStats(req, res);
}
