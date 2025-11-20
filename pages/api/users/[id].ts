import { NextApiRequest, NextApiResponse } from "next";
import { createApiHandler } from "@utils/createApiHandler";
import { container } from "tsyringe";
import { UserController } from "@controllers/UserController";

export default createApiHandler({
  DELETE: async (req: NextApiRequest, res: NextApiResponse) => {
    const controller = container.resolve(UserController);
    return await controller.deleteUser(req, res);
  },
});
