import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@database/client.connection";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, role } = req.body;
  if (!userId || !role || !["flapjack", "owner", "user"].includes(role)) {
    return res.status(400).json({ error: "Invalid userId or role" });
  }

  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true });
}
