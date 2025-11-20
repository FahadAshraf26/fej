import { IBaseRepository } from "./IBaseRepository";
import { IUserDetails } from "interfaces/IUserDetails";
export interface User extends IUserDetails {}
export interface IUserRepository extends IBaseRepository<IUserDetails> {
  getByEmail(email: string): Promise<{ user: IUserDetails | null; error: any }>;
  getByCustomerId(customerId: string): Promise<{ user: IUserDetails | null; error: any }>;
  findBy(identifier: string): Promise<{ user: IUserDetails | null; error: any }>;
  updateUserCustomerId(email: string, customerId: string): Promise<void>;
  updateSubscriptionStatus(customerId: string, isActive: boolean): Promise<void>;
  updateRestaurantId(userId: string, restaurantId: string): Promise<void>;
  updateStripeCustomerId(userId: string, customerId: string): Promise<void>;
}
