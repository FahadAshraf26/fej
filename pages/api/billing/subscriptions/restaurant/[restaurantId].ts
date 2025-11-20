import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@database/client.connection";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { restaurantId } = req.query;

  if (!restaurantId) {
    return res.status(400).json({ error: "Restaurant ID is required" });
  }

  try {
    const { data: subscriptions, error } = await supabase
      .from("subscriptions")
      .select(
        `
        *,
        plans:plan_id (
          id,
          name,
          description,
          price,
          currency,
          stripePriceId,
          trialDays,
          features,
          isActive
        )
      `
      )
      .eq("restaurant_id", restaurantId)
      .neq("status", "incomplete_expired")
      .order("is_active", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    // Return all subscriptions
    return res.status(200).json({ subscriptions: subscriptions || [] });
  } catch (error) {
    console.error("Error in restaurant-subscription route:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
