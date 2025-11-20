export interface ISubscription {
  status: string;
  current_period_start: Date;
  current_period_end: Date;
  updated_at: Date;
  is_active: boolean;
  plan_id: string;
  latest_invoice_id: string;
  trial_end_date?: Date;
  trial_activated?: boolean;
  trial_start_date?: Date;
  original_trial_end_date?: Date;
  payment_method_id?: string;
  send_invoices?: boolean;
  canceled_at: Date | null;
  cancel_at: Date | null;
}
