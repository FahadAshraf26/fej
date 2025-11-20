export const PLAN_TIERS = ["basic", "plus", "premium"] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];
