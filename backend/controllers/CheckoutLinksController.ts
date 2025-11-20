import { SubscriptionCheckoutLinkService } from "@services/payment/SubscriptionCheckoutLinkService";
import { Authenticate } from "../decorators/authDecorator";
import type { NextApiRequest, NextApiResponse } from "next";
import { container, injectable, inject } from "tsyringe";

@injectable()
export class CheckoutLinksController {
  constructor(
    @inject(SubscriptionCheckoutLinkService)
    private checkoutLinkService: SubscriptionCheckoutLinkService
  ) {}

  /**
   * Get checkout links for a restaurant
   */
  @Authenticate({ requiredRoles: ["flapjack"] })
  public async getCheckoutLinks(req: NextApiRequest, res: NextApiResponse) {
    try {
      const { restaurantId } = req.query;

      if (!restaurantId || typeof restaurantId !== "string") {
        return res.status(400).json({ message: "Restaurant ID is required" });
      }

      const checkoutLinks = await this.checkoutLinkService.getCheckoutLinksByRestaurant(
        restaurantId
      );
      return res.status(200).json(checkoutLinks);
    } catch (error: any) {
      console.error("Error fetching checkout links:", error);
      return res.status(500).json({
        message: error.message || "Failed to fetch checkout links",
      });
    }
  }
}

export const checkoutLinksController = container.resolve(CheckoutLinksController);
