import { inject, injectable } from "tsyringe";
import { NextApiRequest, NextApiResponse } from "next";
import { PipedriveService, PipedriveDealData } from "@services/PipedriveService";
import { dispatchErrorEvent, dispatchInfoEvent } from "@services/eventService";
import { RELEVANT_DEAL_EVENTS } from "@Config/pipedrive";

export interface PipedriveWebhookPayload {
  data: any; // v2: The deal object (current state)
  previous?: any; // The previous state of the deal
  meta: {
    version?: string; // v2 uses '2.0'
    action?: string;
    entity?: string; // v2 uses 'entity' instead of 'object'
    change_source?: "app" | "api";
    id?: number | string;
    entity_id?: string; // v2
    company_id?: number | string;
    user_id?: number | string;
    host?: string;
    timestamp?: number | string;
    permitted_user_ids?: number[] | string[];
    is_bulk_edit?: boolean; // v2
    webhook_id?: number | string;
    webhook_owner_id?: string; // v2
    correlation_id?: string; // v2
    attempt?: number; // v2
    type?: string; // v2
    [key: string]: any;
  };
}

@injectable()
export class WebhookController {
  constructor(@inject(PipedriveService) private pipedriveService: PipedriveService) {}

  async updateDeal(req: NextApiRequest, res: NextApiResponse) {
    try {
      const payload = req.body;
      
      // Check if this webhook was triggered by our own API update
      // Pipedrive includes meta.change_source when the change comes from API
      const changeSource = payload.meta?.change_source;
      if (changeSource === 'api') {
        console.log(`[Webhook Debug] Ignoring webhook for deal ${payload.data?.id}: triggered by API update (our own change)`);
        return res.status(200).json({
          success: true,
          message: "Webhook ignored - triggered by API update",
        });
      }
      
      // Pipedrive webhooks v2 use 'data' for the current state of the object
      const deal = payload.data;
      if (!deal) {
        console.error('[Webhook Error] No deal data found in payload.data', {
          payloadKeys: Object.keys(payload),
          meta: payload.meta,
        });
        return res.status(400).json({
          error: "Invalid payload",
          message: "No deal data found in webhook payload",
        });
      }
      
      const dealData = await this.pipedriveService.updateDeal(deal);
      return res.status(200).json({
        success: true,
        message: "Subscription link generated successfully",
        data: {
          dealId: deal.id,
          dealData,
        },
      });
    } catch (error: any) {
      console.error("Webhook processing error:", error);
      dispatchErrorEvent("Webhook processing failed", {
        error: error.message,
        stack: error.stack,
      });

      return res.status(500).json({
        error: "Internal server error",
        message: "Failed to process webhook",
      });
    }
  }

  async get(req: NextApiRequest, res: NextApiResponse) {
    // Handle GET requests for webhook verification (if needed by Pipedrive)
    return res.status(200).json({
      message: "Webhook endpoint is active",
      timestamp: new Date().toISOString(),
    });
  }
}
