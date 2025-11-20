import { NextApiRequest, NextApiResponse } from "next";
import { createApiHandler } from "@utils/createApiHandler";
import { container } from "tsyringe";
import { CheckoutLinksController } from "@controllers/CheckoutLinksController";

export default createApiHandler({
  GET: async (req: NextApiRequest, res: NextApiResponse) => {
    const controller = container.resolve(CheckoutLinksController);
    return controller.getCheckoutLinks(req, res);
  },
});
