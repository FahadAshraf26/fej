// src/middleware/withErrorHandling.ts
import { NextApiRequest, NextApiResponse } from "next";
import { handleError } from "./errorHandler";

type ApiHandler = (
  req: NextApiRequest,
  res: NextApiResponse
) => Promise<void | NextApiResponse>;

export function withErrorHandling(handler: ApiHandler): ApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      return await handler(req, res);
    } catch (error) {
      return handleError(error as Error, req, res);
    }
  };
}
