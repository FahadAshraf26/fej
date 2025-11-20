import { ImportController } from "../../../backend/controllers/ImportController";
import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@database/client.connection";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "900mb",
    },
  },
};

export const maxDuration = 120; // Allow function to run for up to 2 minutes

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check if Supabase is configured
  if (!supabase) {
    return res.status(503).json({ error: "Database configuration missing" });
  }

  // Get the auth token from the request headers
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No authorization header" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  // Verify the token and get the session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: "Invalid token" });
  }

  // Get user details from profiles table
  const { data: userData, error: userError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userError || !userData || userData.role !== "flapjack") {
    return res.status(403).json({ error: "Forbidden - Flapjack users only" });
  }

  return ImportController.processMenu(req, res);
}
