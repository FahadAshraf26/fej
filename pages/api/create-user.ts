import { NextApiRequest, NextApiResponse } from "next";
import { getUserService } from "../../lib/container";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { phone, email, restaurant_id, role } = req.body;

    // Validate required fields
    if ((!phone && !email) || !restaurant_id || !role) {
      return res.status(400).json({
        error: "Missing required fields: phone, email, restaurant_id, and role are required",
      });
    }

    // Trim leading and trailing spaces from email and phone
    const trimmedEmail = email ? email.trim() : "";
    const trimmedPhone = phone ? phone.trim() : "";

    // Check for trailing/leading spaces
    if (email && email !== trimmedEmail) {
      return res.status(400).json({
        error: "Email cannot have leading or trailing spaces",
      });
    }

    if (phone && phone !== trimmedPhone) {
      return res.status(400).json({
        error: "Phone number cannot have leading or trailing spaces",
      });
    }

    // Use UserService to handle user creation or update with trimmed values
    const userService = getUserService();
    const user = await userService.createOrUpdateUser(trimmedEmail, trimmedPhone, restaurant_id, role);

    res.status(200).json(user);
  } catch (error: any) {
    console.error("Error in create-user API:", error);
    res.status(400).json({ error: error.message });
  }
}
