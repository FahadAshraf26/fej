import { NextApiRequest, NextApiResponse } from "next";
import { userController } from "../../../backend/controllers/UserController";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      await userController.checkUserExists(req, res);
    } catch (error) {
      console.error("Error in check user exists API:", error);
      res.status(500).json({ error: "Failed to check user existence" });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
