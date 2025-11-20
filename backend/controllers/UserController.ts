import { type NextApiRequest, type NextApiResponse } from "next";
import { container, inject, injectable } from "tsyringe";
import { UserService } from "../services/user/UserService";
import { Authenticate } from "../decorators/authDecorator";
import { validateRequest } from "@utils/validation";
import { getTrialUsersSchema } from "../schemas/user.schema";

@injectable()
export class UserController {
  constructor(@inject(UserService) private userService: UserService) {}

  @Authenticate({ requiredRoles: ["flapjack"] })
  public async getTrialUsers(req: NextApiRequest, res: NextApiResponse) {
    const validation = await validateRequest(getTrialUsersSchema, req, res, "query");
    const pageSize = 10;
    const { page, search } = validation.data!;
    const { users, totalPages, currentPage } = await this.userService.getTrialUsers(
      page,
      pageSize,
      search
    );
    return res.status(200).json({
      users,
      totalPages,
      currentPage,
    });
  }

  /**
   * Convert a trial user to a paid user
   */
  @Authenticate({ requiredRoles: ["flapjack"] })
  public async convertTrialToPaid(req: NextApiRequest, res: NextApiResponse) {
    try {
      const { customerId } = req.body;

      if (!customerId) {
        return res.status(400).json({ message: "Missing customer ID" });
      }

      await this.userService.convertTrialToPaid(customerId);
      return res.status(200).json({ message: "User converted successfully" });
    } catch (error) {
      console.error("Error converting trial user:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Delete a trial user
   */
  @Authenticate({ requiredRoles: ["flapjack"] })
  public async deleteTrialUser(req: NextApiRequest, res: NextApiResponse) {
    try {
      const { customerId } = req.query;

      if (!customerId || typeof customerId !== "string") {
        return res.status(400).json({ message: "Missing customer ID" });
      }

      await this.userService.deleteTrialUser(customerId);
      return res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting trial user:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Check if a user exists by email or phone
   */
  public async checkUserExists(req: NextApiRequest, res: NextApiResponse) {
    try {
      const { email, phone } = req.query;

      if (!email && !phone) {
        return res.status(400).json({
          message: "Either email or phone must be provided",
        });
      }

      const result = await this.userService.checkUserExists(email as string, phone as string);

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error checking user existence:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Delete a user by ID
   */
  public async deleteUser(req: NextApiRequest, res: NextApiResponse) {
    try {
      const { id } = req.query;

      if (!id || typeof id !== "string") {
        return res.status(400).json({ message: "User ID is required" });
      }

      await this.userService.delete(id);
      return res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

export const userController = container.resolve(UserController);
