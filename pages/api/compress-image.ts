import type { NextApiRequest, NextApiResponse } from "next";
import tinify from "tinify";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

tinify.key = process.env.TINIFY_API_KEY || "";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    const { imageData, maxWidth, maxHeight } = req.body;

    // Validate input
    if (!imageData) {
      return res.status(400).json({
        success: false,
        message: "No image data provided",
      });
    }

    if (!maxWidth || !maxHeight) {
      return res.status(400).json({
        success: false,
        message: "Image dimensions are required",
      });
    }

    // Check if Tinify API key is configured
    if (!process.env.TINIFY_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Image compression service not available",
      });
    }

    // Validate base64 data
    try {
      const buffer = Buffer.from(imageData, "base64");
      if (buffer.length === 0) {
        throw new Error("Invalid image data");
      }
    } catch (bufferError) {
      return res.status(400).json({
        success: false,
        message: "Invalid image data format",
      });
    }

    const buffer = Buffer.from(imageData, "base64");

    // Check buffer size (limit to 25MB for Tinify)
    const maxBufferSize = 25 * 1024 * 1024;
    if (buffer.length > maxBufferSize) {
      return res.status(400).json({
        success: false,
        message: "Image too large for compression",
      });
    }

    const source = tinify.fromBuffer(buffer);
    const resized = source.resize({
      method: "fit",
      width: Math.min(maxWidth, 4000), // Limit max dimensions
      height: Math.min(maxHeight, 4000),
    });

    const resultData = await resized.toBuffer();

    if (!resultData || resultData.length === 0) {
      throw new Error("Failed to generate compressed image");
    }

    const base64Result = Buffer.from(resultData).toString("base64");

    res.status(200).json({
      success: true,
      data: base64Result,
    });
  } catch (error: any) {
    // Provide specific error messages based on error type
    let message = "Error compressing image";
    let statusCode = 500;

    if (error.message?.includes("account")) {
      message = "Image compression service account issue";
      statusCode = 503;
    } else if (error.message?.includes("limit")) {
      message = "Image compression service limit reached";
      statusCode = 503;
    } else if (error.message?.includes("invalid") || error.message?.includes("format")) {
      message = "Invalid image format";
      statusCode = 400;
    } else if (error.message?.includes("network") || error.message?.includes("timeout")) {
      message = "Network error during image compression";
      statusCode = 503;
    } else if (error.message) {
      message = error.message;
    }

    res.status(statusCode).json({
      success: false,
      message,
    });
  }
}
