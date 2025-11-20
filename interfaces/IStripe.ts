export interface ICustomerData {
  email: string;
  name: string;
  restaurantName: string;
  phoneNumber: string;
  sendInvoices?: boolean;
  stripeCustomerId?: string;
  dealId?: number;
  salesRepSlackId?: string;
}

export interface ICouponValidationResult {
  valid: boolean;
  percentOff?: number;
  amountOff?: number;
  currency?: string;
}
