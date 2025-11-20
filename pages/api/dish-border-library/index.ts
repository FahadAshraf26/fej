import { NextApiRequest, NextApiResponse } from "next";
import { createApiHandler } from "../../../backend/utils/createApiHandler";
import { supabaseServer as supabase } from "@database/server.connection";

export default createApiHandler({
  GET: async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const refreshToken = req.cookies["supabase-refresh-token"] ?? "";
      const accessToken = req.cookies["supabase-auth-token"] ?? "";
      await supabase.auth.setSession({
        refresh_token: refreshToken,
        access_token: accessToken,
      });
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { template_id } = req.query;

      if (!template_id) {
        return res.status(400).json({ error: "template_id is required" });
      }

      const { data, error } = await supabase
        .from("dish_border_library")
        .select("*")
        .eq("template_id", template_id)
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching dish borders:", error);
        return res.status(500).json({ error: "Failed to fetch dish borders" });
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error("Dish border library GET error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  POST: async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Authentication
      const refreshToken = req.cookies["supabase-refresh-token"] ?? "";
      const accessToken = req.cookies["supabase-auth-token"] ?? "";
      await supabase.auth.setSession({
        refresh_token: refreshToken,
        access_token: accessToken,
      });
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const {
        template_id,
        name,
        description,
        image_url,
        thumbnail_url,
        file_path,
        file_size,
        mime_type,
      } = req.body;

      if (!template_id || !name || !image_url || !file_path) {
        return res.status(400).json({
          error: "template_id, name, image_url, and file_path are required",
        });
      }

      const { data, error } = await supabase
        .from("dish_border_library")
        .insert({
          template_id,
          name,
          description,
          image_url,
          thumbnail_url,
          file_path,
          file_size,
          mime_type,
          created_by: authData.user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating dish border:", error);
        return res.status(500).json({ error: "Failed to create dish border" });
      }

      return res.status(201).json(data);
    } catch (error) {
      console.error("Dish border library POST error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  DELETE: async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const refreshToken = req.cookies["supabase-refresh-token"] ?? "";
      const accessToken = req.cookies["supabase-auth-token"] ?? "";
      await supabase.auth.setSession({
        refresh_token: refreshToken,
        access_token: accessToken,
      });
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: "Dish border ID is required" });
      }

      const { error } = await supabase
        .from("dish_border_library")
        .update({ is_active: false })
        .eq("id", id);

      if (error) {
        console.error("Error deleting dish border:", error);
        return res.status(500).json({ error: "Failed to delete dish border" });
      }

      return res.status(200).json({ message: "Dish border deleted successfully" });
    } catch (error) {
      console.error("Dish border library DELETE error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
});
