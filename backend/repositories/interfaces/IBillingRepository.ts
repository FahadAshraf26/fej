import { IBaseRepository } from "./IBaseRepository";

export interface Billing {
  id: string;
  customer_id: string;
  subscription_id: string;
  price_id: string;
  status: string;
  trial_activated: boolean;
  trial_start_date?: Date;
  trial_end_date?: Date;
  original_trial_end_date?: Date;
  trial_extended_count?: number;
  trial_extended_days?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface SubscriptionData {
  status: string;
  current_period_start: Date;
  current_period_end: Date;
  updated_at: Date;
  is_active: boolean;
  restaurant_id: string;
  profile_id: string;
  plan_id: string;
  latest_invoice_id: string;
  trial_end_date?: Date;
  trial_activated?: boolean;
  trial_start_date?: Date;
  original_trial_end_date?: Date;
  payment_method_id?: string;
  stripe_subscription_id?: string;
  created_at?: Date;
  send_invoices?: boolean;
  trial_extended_days?: number;
  trial_extended_count?: number;
}

export interface SubscriptionHistoryData {
  subscription_id: string;
  event_type: string;
  event_data: any;
  previous_state?: any;
  user_id: string;
  restaurant_id: string;
}

export interface IBillingRepository extends IBaseRepository<Billing> {
  getByCustomerId(customerId: string): Promise<{ billing: Billing | null; error: any }>;
  getBySubscriptionId(subscriptionId: string): Promise<{ billing: Billing | null; error: any }>;
  updateTrialDates(
    subscriptionId: string,
    trialEndDate: Date,
    extendedCount: number,
    extendedDays: number
  ): Promise<void>;
  updateSubscriptionStatus(subscriptionId: string, status: string): Promise<void>;
  updatePriceId(subscriptionId: string, priceId: string): Promise<void>;
  getPlanByPriceId(priceId: string): Promise<{ data: any; error: any }>;
  getSubscriptionWithCustomer(subscriptionId: string): Promise<{
    data: {
      profiles: {
        stripe_customer_id: string;
      };
    } | null;
    error: any;
  }>;

  // New methods for subscription handling
  upsertSubscription(data: SubscriptionData): Promise<{ data: any; error: any }>;
  recordSubscriptionHistory(data: SubscriptionHistoryData): Promise<void>;
  getActiveSubscriptionsForUser(userId: string): Promise<any[]>;
  updateUserSubscriptionStatus(userId: string, isActive: boolean): Promise<void>;
  getOrCreateSubscription(
    subscriptionId: string,
    data: SubscriptionData
  ): Promise<{ data: any; error: any }>;

  /**
   * Cancels a subscription with a reason
   */
  cancelSubscriptionWithReason(
    subscriptionId: string,
    reason: string
  ): Promise<{ data: any; error: any }>;

  /**
   * Undoes a subscription cancellation
   */
  undoSubscriptionCancellation(subscriptionId: string): Promise<{ data: any; error: any }>;
}
