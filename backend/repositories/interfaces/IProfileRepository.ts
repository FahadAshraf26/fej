import { IBaseRepository } from "./IBaseRepository";

export interface Profile {
  id: string;
  email: string;
  customer_name: string;
  phone: string;
  stripe_customer_id: string;
  role: string;
  subscriptionActive: boolean;
  restaurant_id?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface IProfileRepository extends IBaseRepository<Profile> {
  getByEmail(email: string): Promise<{ profile: Profile | null; error: any }>;
  getByCustomerId(
    customerId: string
  ): Promise<{ profile: Profile | null; error: any }>;
  updateUserCustomerId(email: string, customerId: string): Promise<void>;
  updateSubscriptionStatus(
    customerId: string,
    isActive: boolean
  ): Promise<void>;
  updateRestaurantId(profileId: string, restaurantId: string): Promise<void>;
}
