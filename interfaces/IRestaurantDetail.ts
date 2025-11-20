export interface IRestaurantDetail {
  name: string;
  location: string | null;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  description: string | null;
  owner_id?: string;
  label?: string;
  value?: string;
  id?: string;
  subscriptionStatus?:
    | "past due"
    | "active"
    | "trialing"
    | "partially active"
    | "inactive"
    | "unknown"
    | "{}";
}
