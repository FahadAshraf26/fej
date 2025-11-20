import { NextApiRequest, NextApiResponse } from "next";
import { createApiHandler } from "@utils/createApiHandler";
import { container } from "tsyringe";
import { BillingController } from "@controllers/BillingController";

export default createApiHandler({
  GET: async (req: NextApiRequest, res: NextApiResponse) => {
    const controller = container.resolve(BillingController);
    return await controller.get(req, res);
  },
  POST: async (req: NextApiRequest, res: NextApiResponse) => {
    const controller = container.resolve(BillingController);
    return await controller.post(req, res);
  },
});
