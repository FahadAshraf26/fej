import { User } from "@supabase/supabase-js";

export interface ISubscription {
  id: string;
  profile_id: string;
  plan_id: string;
  stripe_subscription_id: string | null;
  status: string;
  is_active: boolean;
  trial_activated: boolean;
  trial_start_date: string | null;
  trial_end_date: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  charge_count: number;
  latest_invoice_id: string | null;
  created_at: string;
  updated_at: string;
  trial_extended_count: number;
  trial_extended_days: number;
  original_trial_end_date: string | null;
  payment_method_id: string | null;
  coupon_code: string | null;
  billing_cycle_anchor: string | null;
  send_invoices: boolean;
  plans?: {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    stripePriceId: string;
    trialDays: number;
    features: any[];
    isActive: boolean;
  };
}

export interface IUserDetails extends User {
  subscriptionActive?: boolean;
  subscriptionExpiry?: string;
  role?: string;
  restaurant_id?: string;
  restaurant?: any;
  showMenuChange: boolean;
  customer_name: string;
  stripe_customer_id?: string;
  subscription?: ISubscription;
  trialActivated?: boolean;
  trialStartDate?: string;
  trialEndDate?: string;
  chargeCount?: number;
  chargeStartDate?: string;
  chargeEndDate?: string;
  trialStatus?: string;
}
