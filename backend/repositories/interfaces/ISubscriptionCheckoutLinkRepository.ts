export interface ISubscriptionCheckoutLinkRepository {
  create(data: {
    user_id: string;
    restaurant_id: string;
    plan_id: string;
    stripe_customer_id: string;
    original_checkout_url: string;
    expires_at: Date;
    trial_days?: number;
    trial_enabled?: boolean;
  }): Promise<{ id: string; error?: any }>;

  getById(id: string): Promise<{ data: any; error?: any }>;

  updateStatus(id: string, status: "active" | "expired" | "used"): Promise<{ error?: any }>;

  update(data: {
    id: string;
    original_checkout_url?: string;
    expires_at?: Date;
    status?: "active" | "expired" | "used";
    updated_at?: Date;
  }): Promise<{ error?: any }>;

  cleanupExpiredLinks(): Promise<{ error?: any }>;

  getByUserAndPlan(userId: string, planId: string): Promise<{ data: any; error?: any }>;

  getByRestaurant(restaurantId: string): Promise<{ data: any[]; error?: any }>;
}
