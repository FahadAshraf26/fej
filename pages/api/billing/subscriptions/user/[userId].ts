import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@database/client.connection";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const { data: subscription, error } = await supabase
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
      .eq("profile_id", userId)
      .eq("is_active", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No subscription found
        return res.status(200).json(null);
      }
      console.error("Error fetching subscription:", error);
      return res.status(500).json({ error: "Failed to fetch subscription" });
    }

    return res.status(200).json(subscription);
  } catch (error) {
    console.error("Error in user-subscription route:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
