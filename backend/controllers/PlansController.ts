import { PlanService } from "@services/payment/PlanService";
import { PlanError } from "@errors/PlanError";

import type { NextApiRequest, NextApiResponse } from "next";
import { injectable } from "tsyringe";

@injectable()
export class PlansController {
  constructor(private planService: PlanService) {}

  private handleError(error: unknown, res: NextApiResponse) {
    if (error instanceof PlanError) {
      return res.status(error.statusCode || 500).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }

  async getAllPlans(req: NextApiRequest, res: NextApiResponse) {
    try {
      const plans = await this.planService.getAllPlans();
      return res.status(200).json(plans);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getAllTieredPlans(req: NextApiRequest, res: NextApiResponse) {
    try {
      const plans = await this.planService.getAllTieredPlans();
      return res.status(200).json(plans);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getPlansByTier(req: NextApiRequest, res: NextApiResponse) {
    try {
      const { tier } = req.query;
      this.planService.validateTier(tier);
      const plans = await this.planService.getPlansByTier(tier);
      return res.status(200).json(plans);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  // Keep the original method for backward compatibility
  async handleGet(req: NextApiRequest, res: NextApiResponse) {
    const { type, plan } = req.query;

    try {
      switch (type) {
        case "all":
          return await this.getAllPlans(req, res);
        case "all-tiered":
          return await this.getAllTieredPlans(req, res);
        case "tier":
          // Override query parameter
          req.query.tier = plan;
          return await this.getPlansByTier(req, res);
        default:
          throw new PlanError("Invalid request type", 400);
      }
    } catch (error) {
      this.handleError(error, res);
    }
  }
}
