// backend/utils/validation.ts
import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

type ValidationSource = "body" | "query";

export async function validateRequest<T extends z.ZodType>(
  schema: T,
  req: NextApiRequest,
  res: NextApiResponse,
  source: ValidationSource = "body"
): Promise<{ success: boolean; data?: z.infer<T>; error?: z.ZodError }> {
  try {
    // Get data from request based on source
    const data = source === "body" ? req.body : req.query;

    // Parse and validate with Zod
    const validatedData = schema.parse(data);

    return {
      success: true,
      data: validatedData,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error,
      };
    }

    throw error; // Re-throw if it's not a Zod error
  }
}
