import { NextApiRequest, NextApiResponse } from "next";
import { createApiHandler } from "@utils/createApiHandler";
import { container } from "tsyringe";
import { UserController } from "@controllers/UserController";

export default createApiHandler({
  GET: async (req: NextApiRequest, res: NextApiResponse) => {
    const controller = container.resolve(UserController);
    return await controller.getTrialUsers(req, res);
  },
});
