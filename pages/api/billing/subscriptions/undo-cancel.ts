import { NextApiRequest, NextApiResponse } from "next";
import { container } from "tsyringe";
import { BillingService } from "@services/payment/BillingService";
import { BillingError } from "@utils/errors/DomainErrors";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ error: "Subscription ID is required" });
    }

    const billingService = container.resolve(BillingService);
    await billingService.undoSubscriptionCancellation(subscriptionId);

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Error undoing subscription cancellation:", error);
    if (error instanceof BillingError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}
