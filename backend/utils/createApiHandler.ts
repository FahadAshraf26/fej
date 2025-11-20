import { NextApiRequest, NextApiResponse } from "next";
import { withErrorHandling } from "../middleware/withErrorHandling";
import { MethodNotAllowedError } from "../utils/errors/HttpErrors";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type HandlerMap = Partial<
  Record<HttpMethod, (req: NextApiRequest, res: NextApiResponse) => Promise<void | NextApiResponse>>
>;

export function createApiHandler(handlers: HandlerMap) {
  return withErrorHandling(async (req: NextApiRequest, res: NextApiResponse) => {
    const method = req.method as HttpMethod;
    const handler = handlers[method];

    if (handler) {
      return await handler(req, res);
    }

    // Set Allow header with the supported methods
    const allowedMethods = Object.keys(handlers).join(", ");
    res.setHeader("Allow", allowedMethods);

    throw new MethodNotAllowedError();
  });
}
