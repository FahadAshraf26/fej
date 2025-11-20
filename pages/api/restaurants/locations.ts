// pages/api/restaurants/locations.js

import { NextApiRequest, NextApiResponse } from "next";

import { supabaseServer as supabase } from "@database/server.connection";
import { restaurantController } from "@controllers/RestaurantController";
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const refreshToken = req.cookies["supabase-refresh-token"] ?? "";
  const accessToken = req.cookies["supabase-auth-token"] ?? "";
  await supabase.auth.setSession({
    refresh_token: refreshToken,
    access_token: accessToken,
  });
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return null;
  }
  // Check if user is authenticated

  if (!data) {
    return res.status(401).json({
      error: "Unauthorized",
    });
  }

  // Route based on HTTP method
  switch (req.method) {
    case "GET":
      // Get locations for a restaurant
      return restaurantController.getRestaurantLocations(req, res);

    default:
      return res.status(405).json({ error: "Method not allowed" });
  }
}
