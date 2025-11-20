import { NextApiRequest, NextApiResponse } from "next";
import { restaurantController } from "../../../backend/controllers/RestaurantController";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      await restaurantController.getRestaurantById(req, res);
    } catch (error) {
      console.error("Error in restaurant API:", error);
      res.status(500).json({ error: "Failed to fetch restaurant details" });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
