import { create } from "zustand";

interface PlanFeatures {
  tier: string;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  stripePriceId: string;
  trialDays: number;
  features: PlanFeatures;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Subscription {
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
  plans: Plan;
}

interface PlanStore {
  plans: Plan[];
  currentSubscription: Subscription | null;
  isLoading: boolean;
  error: string | null;
  fetchPlans: () => Promise<void>;
  fetchCurrentSubscription: (userId: string) => Promise<void>;
  clearSubscription: () => void;
  updateSubscription: (stripeSubscriptionId: string, plan: Plan) => Promise<void>;
}

export const usePlanStore = create<PlanStore>((set, get) => ({
  plans: [],
  currentSubscription: null,
  isLoading: false,
  error: null,
  fetchPlans: async () => {
    // Only fetch if plans are not already loaded
    if (get().plans.length > 0) return;

    try {
      set({ isLoading: true, error: null });
      const response = await fetch("/api/billing/plans");
      if (!response.ok) {
        throw new Error("Failed to fetch plans");
      }
      const data = await response.json();
      set({ plans: data, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "An error occurred",
        isLoading: false,
      });
    }
  },
  fetchCurrentSubscription: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await fetch(`/api/billing/subscriptions/user/${userId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch subscription");
      }
      const data = await response.json();
      set({ currentSubscription: data, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "An error occurred",
        isLoading: false,
      });
    }
  },

  clearSubscription: () => {
    set({ currentSubscription: null, error: null });
  },
  updateSubscription: async (stripeSubscriptionId: string, plan: Plan) => {
    try {
      set({ isLoading: true, error: null });
      const response = await fetch(`/api/billing/subscriptions/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stripeSubscriptionId,
          plan,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update subscription");
      }

      const data = await response.json();
      set((state) => ({
        currentSubscription: state.currentSubscription
          ? {
              ...state.currentSubscription,
              ...data,
            }
          : null,
        isLoading: false,
      }));

      return data;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "An error occurred",
        isLoading: false,
      });
      throw error;
    }
  },
}));
