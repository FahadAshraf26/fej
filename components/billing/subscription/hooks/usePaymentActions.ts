// components/billing/subscription/hooks/usePaymentActions.ts
import { useState } from "react";

interface UsePaymentActionsProps {
  subscription: string | null;
  sessionId: string | string[] | undefined;
  onError: (error: string) => void;
}

export function usePaymentActions({ subscription, sessionId, onError }: UsePaymentActionsProps) {
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);

  const handleUpdatePaymentMethod = async () => {
    if (!subscription) {
      onError("No subscription found");
      return;
    }

    setIsUpdatingPayment(true);

    try {
      const portalResponse = await fetch("/api/billing/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription_id: subscription,
          returnUrl: "/billing/success?session_id=" + sessionId,
        }),
      });

      if (!portalResponse.ok) {
        throw new Error("Failed to update payment method");
      }

      const portalData = await portalResponse.json();
      window.location.href = portalData.url;
    } catch (err) {
      onError("Failed to update payment method. Please try again.");
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  return {
    handleUpdatePaymentMethod,
    isUpdatingPayment,
  };
}
