import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@database/client.connection";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Invalid restaurant ID" });
    }

    // Get all subscriptions for the restaurant
    const { data: allSubscriptions, error: subscriptionsError } = await supabase
      .from("subscriptions")
      .select(
        `
        *,
        plans (
          id,
          name,
          description,
          price,
          currency,
          features
        ),
        profiles!inner (
          id,
          email,
          customer_name,
          role,
          restaurant_id
        )
      `
      )
      .eq("restaurant_id", id)
      .neq("status", "incomplete_expired");

    if (subscriptionsError) {
      console.error("Error fetching subscriptions:", subscriptionsError);
      return res.status(500).json({ error: "Failed to fetch subscriptions" });
    }

    if (!allSubscriptions || allSubscriptions.length === 0) {
      return res.status(200).json({
        subscriptions: [],
      });
    }

    return res.status(200).json({
      subscriptions: allSubscriptions,
    });
  } catch (error) {
    console.error("Error in owner API:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
