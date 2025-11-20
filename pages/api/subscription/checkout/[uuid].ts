import { NextApiRequest, NextApiResponse } from "next";
import { createApiHandler } from "@utils/createApiHandler";
import { container } from "tsyringe";
import { SubscriptionController } from "@controllers/SubscriptionController";

export default createApiHandler({
  GET: async (req: NextApiRequest, res: NextApiResponse) => {
    const controller = container.resolve(SubscriptionController);
    return await controller.get(req, res);
  },
  POST: async (req: NextApiRequest, res: NextApiResponse) => {
    const controller = container.resolve(SubscriptionController);
    return await controller.post(req, res);
  },
});
