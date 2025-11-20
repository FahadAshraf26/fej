import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { handleError } from "../../../helpers/CommonFunctions";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type Data = {
  name: string;
  error?: string;
};
async function updateRestaurantChannel(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { customer_id, channel_id } = req.body;

  try {
    const profile = await getProfile(customer_id);
    if (!profile) {
      res.status(404).send("Profile not found");
      return;
    }

    await updateRestaurant(profile.restaurant_id, channel_id, res);

    res.status(200).send("Restaurant updated successfully");
  } catch (err) {
    handleError(`Caught error:, ${err}`, undefined, true);
    res.status(500).send("Server error");
  }
}

async function getProfile(customer_id: string) {
  let { data: profile, error } = await supabase
    .from("profiles")
    .select("restaurant_id")
    .eq("stripe_customer_id", customer_id)
    .single();

  if (error) {
    handleError(`Error fetching profile: ${error.message}`, undefined, true);
    return null;
  }

  if (!profile) {
    handleError(`No profile found for uid: ${customer_id}`, undefined, true);
    return null;
  }

  return profile;
}

async function updateRestaurant(
  restaurant_id: string,
  channel_id: string,
  res: NextApiResponse
) {
  let { data: restaurant, error } = await supabase
    .from("restaurants")
    .update({ slack_channel_id: channel_id })
    .eq("id", restaurant_id);

  if (error) {
    handleError(`Error updating restaurant: ${error.message}`, undefined, true);
    res.status(500).send("Error updating restaurant");
    return null;
  }

  return restaurant;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method === "POST") {
    const { channel_id, customer_id } = req.body;

    // Validate channel_id and customer_id
    if (!channel_id || !customer_id) {
      return res
        .status(400)
        .json({ error: "channel_id and customer_id are required" } as Data);
    }

    await updateRestaurantChannel(req, res);
  } else {
    // Handle other HTTP methods
    res.status(405).json({ error: "Method Not Allowed" } as Data);
  }
}
