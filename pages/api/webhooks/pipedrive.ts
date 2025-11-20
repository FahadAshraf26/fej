import "reflect-metadata";
import { NextApiRequest, NextApiResponse } from "next";
import { createApiHandler } from "@utils/createApiHandler";
import { container } from "tsyringe";
import { WebhookController } from "@controllers/PipedriveController";

export const config = {
  api: {
    bodyParser: true, // Enable body parsing for JSON payloads
  },
};

export default createApiHandler({
  POST: async (req: NextApiRequest, res: NextApiResponse) => {
    const webhookController = container.resolve(WebhookController) as WebhookController;
    return await webhookController.updateDeal(req, res);
  },
  GET: async (req: NextApiRequest, res: NextApiResponse) => {
    const webhookController = container.resolve(WebhookController) as WebhookController;
    return await webhookController.get(req, res);
  },
});
