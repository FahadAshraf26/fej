export interface IPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  stripePriceId: string;
  trialDays: number;
  features: {
    tier: "basic" | "plus" | "premium";
    type?: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
