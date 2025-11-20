import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { handleError } from '../../../helpers/CommonFunctions'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    const { customer_id } = req.body;

    // Validate customer_id
    if (!customer_id) {
      return res.status(400).json({ error: 'customer_id is required' });
    }

    // Query the profiles table for matches with stripe_customer_id
    let { data: profiles, error } = await supabase
      .from('profiles')
      .select('restaurant_id')
      .eq('stripe_customer_id', customer_id)

    if (error) return handleError(error.message, undefined, true)

    if (!profiles || profiles.length === 0) {
      return res.status(404).json({ error: 'No matching profile found' });
    }

    // Get the restaurant_id from that row
    const { restaurant_id } = profiles[0]

    // Query the restaurants table for the row that matches the restaurant id
    let { data: restaurants, error: restaurantError } = await supabase
      .from('restaurants')
      .select('slack_channel_id')
      .eq('id', restaurant_id)

    if (restaurantError) return handleError(restaurantError.message, undefined, true)

    if (!restaurants || restaurants.length === 0) {
      return res.status(404).json({ error: 'No matching restaurant found' });
    }

    // Return the slack_channel_id from that row
    const { slack_channel_id } = restaurants[0]
    return res.status(200).json({ slack_channel_id });

  } else {
    // Handle other HTTP methods
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
