import { NextApiRequest, NextApiResponse } from "next";
import { createApiHandler } from "@utils/createApiHandler";
import { container } from "tsyringe";
import { PlansController } from "@controllers/PlansController";

export default createApiHandler({
  GET: async (req: NextApiRequest, res: NextApiResponse) => {
    const controller = container.resolve(PlansController);
    if (req.query.type === "tier" && req.query.plan === undefined) {
      return res.status(400).json({ error: "Plan tier is required" });
    }

    return controller.getPlansByTier(req, res);
  },
});
