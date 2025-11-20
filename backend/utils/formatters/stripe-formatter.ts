import Stripe from "stripe";
import { NotificationField, NotificationFormatter } from "@utils/types/notification";
import { Notification, NotificationSeverity, NotificationType } from "@utils/types/notification";
import { formatCurrency, formatDate } from "@utils/formatter";

export class StripePaymentIntentFormatter implements NotificationFormatter<Stripe.PaymentIntent> {
  format(
    paymentIntent: Stripe.PaymentIntent,
    status: "success" | "failed" | "pending" = "success"
  ): Notification {
    const severity =
      status === "failed"
        ? NotificationSeverity.ERROR
        : status === "pending"
        ? NotificationSeverity.WARNING
        : NotificationSeverity.SUCCESS;

    const title =
      status === "failed"
        ? "Payment Failed"
        : status === "pending"
        ? "Payment Pending"
        : "Payment Successful";

    const fields = [
      { label: "Payment ID", value: paymentIntent.id },
      {
        label: "Amount",
        value: formatCurrency(paymentIntent.amount, paymentIntent.currency),
      },
      { label: "Status", value: paymentIntent.status },
    ];

    if (paymentIntent.last_payment_error && status === "failed") {
      fields.push({
        label: "Reason",
        value: paymentIntent.last_payment_error.message || "Unknown error",
      });
    }

    return {
      title,
      message: `Payment ${status}: ${formatCurrency(paymentIntent.amount, paymentIntent.currency)}`,
      severity,
      type: NotificationType.PAYMENT,
      fields,
      context: `Payment processed at ${formatDate(paymentIntent.created)}`,
      timestamp: new Date(),
    };
  }
}

export class StripeCustomerFormatter implements NotificationFormatter<Stripe.Customer> {
  format(customer: Stripe.Customer, isNew: string = "true"): Notification {
    const isNewCustomer = isNew === "true";

    return {
      title: isNewCustomer ? "New Customer" : "Customer Updated",
      message: `Customer: ${customer.name || customer.email || customer.id}`,
      severity: NotificationSeverity.INFO,
      type: NotificationType.CUSTOMER,
      fields: [
        { label: "Name", value: customer.name || "N/A" },
        { label: "Email", value: customer.email || "N/A" },
        { label: "ID", value: customer.id },
        { label: "Created", value: formatDate(customer.created) },
      ],
      timestamp: new Date(),
    };
  }
}

export class StripeSubscriptionFormatter implements NotificationFormatter<Stripe.Subscription> {
  format(
    subscription: Stripe.Subscription,
    status: "created" | "updated" | "cancelled" = "created"
  ): Notification {
    const title =
      status === "created"
        ? "New Subscription"
        : status === "cancelled"
        ? "Subscription Cancelled"
        : "Subscription Updated";

    const severity =
      status === "cancelled" ? NotificationSeverity.WARNING : NotificationSeverity.INFO;

    let context: string | undefined;

    if (status === "cancelled" && subscription.cancel_at_period_end) {
      context = `Subscription will end at the end of the current billing period (${formatDate(
        subscription?.billing_cycle_anchor
      )})`;
    }

    return {
      title,
      message: `Subscription ${status}: ${subscription.id}`,
      severity,
      type: NotificationType.SUBSCRIPTION,
      fields: [
        { label: "ID", value: subscription.id },
        { label: "Status", value: subscription.status },
        { label: "Customer", value: subscription.customer as string },
        {
          label: "Plan",
          value:
            subscription.items.data[0]?.plan.nickname ||
            subscription.items.data[0]?.price.nickname ||
            "N/A",
        },
      ],
      context,
      timestamp: new Date(),
    };
  }
}

export class StripeInvoiceFormatter implements NotificationFormatter<Stripe.Invoice> {
  format(invoice: Stripe.Invoice, status: "paid" | "failed" = "paid"): Notification {
    const title = status === "paid" ? "Invoice Paid" : "Invoice Payment Failed";
    const severity = status === "paid" ? NotificationSeverity.SUCCESS : NotificationSeverity.ERROR;

    const fields = [
      { label: "Invoice", value: invoice.number || invoice.id },
      {
        label: "Amount",
        value: formatCurrency(
          status === "paid" ? invoice.amount_paid : invoice.amount_due,
          invoice.currency
        ),
      },
      { label: "Customer", value: invoice.customer as string },
    ];

    if (status === "failed") {
      fields.push({
        label: "Attempt Count",
        value: invoice.attempt_count?.toString() || "1",
      });

      if (invoice.next_payment_attempt) {
        fields.push({
          label: "Next Attempt",
          value: formatDate(invoice.next_payment_attempt),
        });
      }
    } else {
      fields.push({
        label: "Date",
        value: formatDate(invoice.status_transitions?.paid_at || invoice.created),
      });
    }

    return {
      title,
      message: `Invoice ${invoice.number || invoice.id} ${
        status === "paid" ? "paid" : "payment failed"
      }: ${formatCurrency(
        status === "paid" ? invoice.amount_paid : invoice.amount_due,
        invoice.currency
      )}`,
      severity,
      type: NotificationType.INVOICE,
      fields: fields as NotificationField[],
      timestamp: new Date(),
    };
  }
}
