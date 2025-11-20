// pages/api/notify.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { sendNotification, sendErrorNotification } from "@services/slackService";
import { stripe } from "@Config/stripe";
import { supabase } from "@database/client.connection";
type ResponseData = {
  success: boolean;
  message: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  // Only allow POST requests

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    const { message, title, type, fields, context, isError } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message text is required",
      });
    }

    // Handle different types of notifications
    if (isError) {
      // Send as error notification
      sendErrorNotification(message, context);
    } else if (title || type || fields || context) {
      // Send as formatted notification
      sendNotification({
        title,
        message,
        type,
        fields,
        context,
      });
    } else {
      // Send as simple message
      sendNotification(message);
    }
    // const fullSubscription = await stripe.subscriptions.retrieve("sub_1ROfUhIf9C6rUysU16Y69Z60");

    return res.status(200).json({
      success: true,
      message: "Notification sent successfully",
      // message: JSON.stringify(fullSubscription, null, 2),
    });
  } catch (error) {
    console.error("API route error:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
