// pages/billing/success.tsx (or wherever your main page is)
// This page is intentionally public and doesn't require authentication
// It's used for Stripe webhook redirects and payment success confirmations
// Configured as a special route in _app.tsx to hide header and authentication-dependent UI
import React from "react";
import { useRouter } from "next/router";

// Import all the new components
import { PaymentSuccessLayout } from "@Components/billing/subscription/PaymentSuccessLayout";
import { LoadingSpinner } from "@Components/billing/subscription/LoadingSpinner";
import { PaymentStatusIcon } from "@Components/billing/subscription/PaymentStatusIcon";
import { PaymentStatusMessage } from "@Components/billing/subscription/PaymentStatusMessage";
import { InvoiceDetails } from "@Components/billing/subscription/InvoiceDetails";
import { ErrorAlert } from "@Components/billing/subscription/ErrorAlert";

// Import custom hooks
import { usePaymentData } from "@Components/billing/subscription/hooks/usePaymentData";
import { usePaymentActions } from "@Components/billing/subscription/hooks/usePaymentActions";

export function StripeSuccessPage() {
  const router = useRouter();
  const { session_id } = router.query;

  // Use custom hooks for data fetching and actions
  const { invoiceData, isLoading, error, paymentStatus, subscription, refetch } =
    usePaymentData(session_id);

  const { handleUpdatePaymentMethod, isUpdatingPayment } = usePaymentActions({
    subscription: subscription || null,
    sessionId: session_id,
    onError: (errorMessage) => {
      console.error("Payment action error:", errorMessage);
    },
  });

  // Show loading state
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Show payment failed state
  if (paymentStatus === "failed") {
    return (
      <PaymentSuccessLayout>
        {/* <PaymentStatusIcon status="failed" /> */}
        <PaymentStatusMessage status="failed" />
        {error && (
          <ErrorAlert
            error={error}
            type="payment-failed"
            onUpdatePaymentMethod={handleUpdatePaymentMethod}
            isUpdatingPayment={isUpdatingPayment}
          />
        )}
      </PaymentSuccessLayout>
    );
  }

  // Show payment success state
  return (
    <PaymentSuccessLayout>
      <PaymentStatusIcon status="success" />
      <PaymentStatusMessage status="success" />

      {/* Show error alert if invoice couldn't be loaded */}
      {error && <ErrorAlert error={error} type="invoice-loading" onRetry={refetch} />}

      {/* Show invoice details if available */}
      {invoiceData && <InvoiceDetails invoiceData={invoiceData} />}
    </PaymentSuccessLayout>
  );
}

export default StripeSuccessPage;
