import { NextApiRequest, NextApiResponse } from "next";
import { container } from "tsyringe";
import { createApiHandler } from "@utils/createApiHandler";
import { BillingController } from "@controllers/BillingController";

export default createApiHandler({
  POST: async (req: NextApiRequest, res: NextApiResponse) => {
    const billingController = container.resolve(BillingController);
    return res.status(200).json(await billingController.cancelSubscription(req));
  },
});
