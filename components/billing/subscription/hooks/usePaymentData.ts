// components/billing/subscription/hooks/usePaymentData.ts
import { useEffect, useState } from "react";

interface InvoiceData {
  invoiceId: string;
  invoiceUrl: string;
}

export type PaymentStatus = "success" | "failed" | "loading";

interface UsePaymentDataReturn {
  invoiceData: InvoiceData | null;
  isLoading: boolean;
  error: string | null;
  paymentStatus: PaymentStatus;
  subscription: string | null | undefined;
  refetch: () => void;
}

export function usePaymentData(sessionId: string | string[] | undefined): UsePaymentDataReturn {
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("loading");
  const [subscription, setSubscription] = useState<string | null | undefined>(undefined);

  const fetchInvoiceData = async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/billing/invoices?session_id=${sessionId}`);

      if (!response.ok) {
        const data = await response.json();
        const errorMessage = data.error || "Failed to fetch invoice data";
        setError(errorMessage);
        setSubscription(data.subscription);

        // Check if the error indicates payment failure
        if (
          errorMessage.toLowerCase().includes("declined") ||
          errorMessage.toLowerCase().includes("failed") ||
          errorMessage.toLowerCase().includes("payment")
        ) {
          setPaymentStatus("failed");
        } else {
          // Payment succeeded but invoice loading failed
          setPaymentStatus("success");
        }
        return;
      }

      const data = await response.json();
      console.log("Invoice data:", data);

      if (data.invoiceUrl) {
        setInvoiceData({
          invoiceUrl: data.invoiceUrl,
          invoiceId: data.invoiceId,
        });
        setPaymentStatus("success");
      } else {
        setError("Invoice data not found");
        setPaymentStatus("success"); // Payment succeeded but no invoice
      }
    } catch (err) {
      console.error("Error fetching invoice data:", err);
      setError("Failed to load invoice details. Please try again later.");
      setPaymentStatus("success"); // Assume payment succeeded if we can't determine
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoiceData();
  }, [sessionId]);

  return {
    invoiceData,
    isLoading,
    error,
    paymentStatus,
    subscription,
    refetch: fetchInvoiceData,
  };
}
