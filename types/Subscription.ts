export type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'past_due' | 'incomplete' | 'incomplete_expired' | 'failed' | 'unpaid';

export interface Subscription {
  id: string;
  status: SubscriptionStatus;
  is_active: boolean;
  canceled_at: string | null;
  cancel_at: string | null;
  trial_activated: boolean;
  trial_end_date: string | null;
  // Add other fields as needed based on your existing subscription structure
}

export interface SubscriptionStatusInfo {
  isActive: boolean;
  isTrialing: boolean;
  isCanceled: boolean;
  isPastDue: boolean;
  hasPaymentIssues: boolean;
  shouldShowBanner: boolean;
  canAccessFeatures: boolean;
}
