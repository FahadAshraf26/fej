import { inject, injectable } from "tsyringe";
import { NextApiRequest, NextApiResponse } from "next";
import { SubscriptionCheckoutLinkService } from "@services/payment/SubscriptionCheckoutLinkService";
import { BillingError, ResourceNotFoundError } from "@utils/errors/DomainErrors";

@injectable()
export class SubscriptionController {
  constructor(
    @inject(SubscriptionCheckoutLinkService) private linkService: SubscriptionCheckoutLinkService
  ) {}

  async get(req: NextApiRequest, res: NextApiResponse) {
    try {
      const { uuid } = req.query;

      if (!uuid || typeof uuid !== "string") {
        return res.status(400).json({
          error: "Invalid checkout link ID",
        });
      }

      // Construct baseUrl from request
      const protocol =
        req.headers["x-forwarded-proto"] || req.headers["x-forwarded-protocol"] || "http";
      const host = req.headers.host;
      const baseUrl = `${protocol}://${host}`;

      const linkValidation = await this.linkService.getAndValidateLink(uuid, baseUrl);
      if (!linkValidation.isValid) {
        return res.status(404).json({
          error: "Checkout link not found or already used",
        });
      }

      if (linkValidation.isExpired && linkValidation.newCheckoutUrl) {
        // Redirect to new checkout URL for expired links
        return res.redirect(302, linkValidation.newCheckoutUrl);
      }

      if (linkValidation.isExpired) {
        return res.status(410).json({
          error: "Checkout link has expired and could not be regenerated",
        });
      }

      // Redirect to original checkout URL for valid links
      return res.redirect(302, linkValidation.data.original_checkout_url);
    } catch (error: any) {
      console.error("Subscription checkout error:", error);

      if (error instanceof ResourceNotFoundError) {
        return res.status(404).json({ error: error.message });
      }

      if (error instanceof BillingError) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(500).json({
        error: "Internal server error while processing checkout link",
      });
    }
  }

  /**
   * The function handles POST requests by returning a "Method not allowed" error with a status code of 405.
   * @param {NextApiRequest} req - NextApiRequest object which represents the incoming HTTP request in a Next.js API route.
   * It contains information about the request such as headers, body, query parameters, and more.
   * @param {NextApiResponse} res - The `res` parameter in the code snippet refers to the NextApiResponse object, which is
   * used to send the HTTP response back to the client. In this case, the code is returning a 405 status code with a JSON
   * object containing an error message "Method not allowed".
   * @returns The code is returning a JSON response with a status of 405 (Method Not Allowed) and an error message stating
   * "Method not allowed".
   */
  async post(req: NextApiRequest, res: NextApiResponse) {
    // Handle any POST requests if needed in the future
    return res.status(405).json({ error: "Method not allowed" });
  }
}
