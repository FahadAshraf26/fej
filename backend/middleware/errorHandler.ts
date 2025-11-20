// src/middleware/errorHandler.ts
import { NextApiRequest, NextApiResponse } from "next";
import { AppError } from "../utils/errors/AppError";
import { ZodError } from "zod";
import { ValidationError } from "../utils/errors/DomainErrors";

export function handleError(
  error: Error,
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Log all errors for monitoring and debugging
  console.error(`[${req.method}] ${req.url}`, error);

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const formattedErrors = error.errors.map((err) => ({
      path: err.path.join("."),
      message: err.message,
    }));

    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      errors: formattedErrors,
    });
  }

  // Handle application errors
  if (error instanceof AppError) {
    const response = {
      success: false,
      code: error.code,
      message: error.message,
    };

    // Add validation details if available
    if (error instanceof ValidationError && error.details) {
      Object.assign(response, { errors: error.details });
    }

    return res.status(error.statusCode).json(response);
  }

  // Handle unexpected errors (non-operational)
  console.error("UNHANDLED ERROR:", error);

  return res.status(500).json({
    success: false,
    code: "INTERNAL_ERROR",
    message:
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : error.message || "Unknown error",
  });
}
