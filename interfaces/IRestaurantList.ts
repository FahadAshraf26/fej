export type Location = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  restaurantId: number;
};

export interface IRestaurantList {
  id: number;
  name: string;
  location: Array<string>;
  locations: Array<Location>;
  description?: string;
  address?: string;
  slack_channel_id?: string | null;
  isAutoLayout?: boolean;
  dietaryIcons?: any | null;
  subscription_override?: boolean;
  created_at?: string;
  owner_id?: string | null;
}
