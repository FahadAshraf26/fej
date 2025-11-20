import { NextApiRequest, NextApiResponse } from "next";
import { createApiHandler } from "@utils/createApiHandler";
import { container } from "tsyringe";
import { BillingController } from "@controllers/BillingController";

export default createApiHandler({
  POST: async (req: NextApiRequest, res: NextApiResponse) => {
    const controller = container.resolve(BillingController);
    return await controller.validateCardFunds(req, res);
  },
});
