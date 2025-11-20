export const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * Calculate days left in trial
 */
export const calculateDaysLeft = (trialEndDate: string | null): number | null => {
  if (!trialEndDate) return null;

  const endDate = new Date(trialEndDate);
  const now = new Date();
  return Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
};

/**
 * Get appropriate color based on subscription status
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case "active":
      return "green";
    case "trialing":
      return "blue";
    case "incomplete":
    case "past_due":
      return "yellow";
    case "canceled":
    case "unpaid":
      return "red";
    default:
      return "gray";
  }
};
/**
 * Format price with currency symbol
 */
export const formatPrice = (price: number, currency: string = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price / 100);
};

/**
 * Determine if a subscription is pending cancellation
 * (has been canceled but is still active until the end of the billing cycle)
 */
export const isPendingCancellation = (subscription: {
  status: string;
  canceled_at: string | null;
  cancel_at: string | null;
}): boolean => {
  // If canceled_at is set but status is still active or trialing
  return (
    !!subscription.canceled_at &&
    (subscription.status === "active" || subscription.status === "trialing") &&
    !!subscription.cancel_at &&
    new Date(subscription.cancel_at) > new Date()
  );
};

/**
 * Get formatted cancellation date
 */
export const getCancellationDate = (cancel_at: string | null): string => {
  if (!cancel_at) return "Unknown date";
  return formatDate(cancel_at);
};
