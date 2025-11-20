import { IBaseRepository } from "./IBaseRepository";

export interface Restaurant {
  id: string;
  name: string;
  owner_id: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  subscription_override?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface IRestaurantRepository extends IBaseRepository<Restaurant> {
  getByOwnerId(
    ownerId: string
  ): Promise<{ restaurant: Restaurant | null; error: any }>;
  getByName(
    name: string
  ): Promise<{ restaurant: Restaurant | null; error: any }>;
  updateOwnerId(restaurantId: string, ownerId: string): Promise<void>;
  updateLogo(restaurantId: string, logoUrl: string): Promise<void>;
}
