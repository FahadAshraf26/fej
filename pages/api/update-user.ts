import { supabaseServer as supabase } from "@database/server.connection";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { email, phone, resturantId, userRole, id } = req.body;

    if (phone) {
      const { data: phoneUser, error: phoneError } = await supabase
        .from("profiles")
        .select("*")
        .eq("phone", phone)
        .neq("id", id)
        .maybeSingle();

      if (phoneError) {
        return res.status(400).json({ error: phoneError.message });
      }

      if (phoneUser) {
        return res.status(400).json({ error: "Phone already exists" });
      }
    }

    if (email) {
      const { data: emailUser, error: emailError } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email)
        .neq("id", id)
        .maybeSingle();

      if (emailError) {
        return res.status(400).json({ error: emailError.message });
      }

      if (emailUser) {
        return res.status(400).json({ error: "Email already exists" });
      }
    }

    const { data, error } = await supabase.auth.admin.updateUserById(id, {
      email: email,
      phone: phone,
    });
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    await supabase
      .from("profiles")
      .update({
        email: email,
        phone: phone,
        restaurant_id: resturantId,
        role: userRole?.label,
      })
      .eq("id", data.user?.id)
      .single();
    const response = await supabase.from("profiles").select("*").eq("id", data.user?.id).single();
    res.status(200).json(response.data);
  } catch (error: any) {
    console.error("Error in update user API:", error);
    res.status(400).json({ error: error.message });
  }
}
