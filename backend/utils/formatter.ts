/**
 * Formats currency amounts
 */
export const formatCurrency = (amount: number, currency: string = "usd"): string => {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  });

  return formatter.format(amount / 100); // Stripe amounts are in cents
};

/**
 * Formats timestamps
 */
export const formatDate = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleString();
};

/**
 * Formats object into readable string
 */
export const formatObject = (obj: any): string => {
  if (!obj) return "N/A";

  if (typeof obj === "object") {
    if (Array.isArray(obj)) {
      return `\`${JSON.stringify(obj, null, 2)}\``;
    }
    return `\`\`\`${JSON.stringify(obj, null, 2)}\`\`\``;
  }

  return String(obj);
};
