// types.ts
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  features: any;
}

export interface Subscription {
  id: string;
  stripe_subscription_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_end_date: string | null;
  trial_activated: boolean;
  is_active: boolean;
  canceled_at: string | null;
  canceled_reason?: string;
  plans: Plan;
  profiles: User;
  cancel_at: string | null;
  cancel_reason?: string;
  cancelled_at: string | null;
  comment?: string;
}

export interface UserSubscriptions {
  user: User;
  subscriptions: Subscription[];
}

export interface SubscriptionTabProps {
  restaurantId: string;
}

export interface SubscriptionCardProps {
  subscription: Subscription;
  onEdit: () => void;
  isFlapjack: boolean;
  onCancel?: (subscription: any) => void;
  onUndoCancel?: (subscription: Subscription) => void;
  isUndoCancelLoading?: boolean;
}

export interface CanceledSubscriptionCardProps extends SubscriptionCardProps {
  onReactivate: () => void;
}

export interface EmptySubscriptionStateProps {
  onAddSubscription: () => void;
  userRole?: string;
}

export interface SubscriptionStatsProps {
  subscriptions: Subscription[];
}

export interface StatItemProps {
  value: number | string;
  label: string;
  color?: string;
}
