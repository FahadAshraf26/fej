import React from "react";
import { Subscription } from "../types";
import { ActiveSubscriptionCard } from "./ActiveSubscriptionCard";
import { TrialSubscriptionCard } from "./TrialSubscriptionCard";
import { PastDueSubscriptionCard } from "./PastDueSubscriptionCard";
import { FailedPaymentCard } from "./FailedPaymentCard";
import { CanceledSubscriptionCard } from "./CanceledSubscriptionCard";
import { InactiveSubscriptionCard } from "./InactiveSubscriptionCard";
import { PendingCancellationCard } from "./PendingCancellationCard";
import { isPendingCancellation } from "../../../../utils/helpers";

interface SubscriptionCardProps {
  subscription: Subscription;
  onEdit: () => void;
  onReactivate: () => void;
  isFlapjack: boolean;
  onCancel: (subscription: any) => void;
  onUndoCancel: (subscription: Subscription) => void;
  isUndoCancelLoading?: boolean;
}

// Helper function to check if subscription is cancelled
const isCancelled = (subscription: Subscription): boolean => {
  // Check both possible field names: canceled_at and cancelled_at
  const canceledAt = subscription.canceled_at || subscription.cancelled_at;
  return subscription.status === "canceled" || !!subscription.cancel_at || !!canceledAt;
};

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  onEdit,
  onReactivate,
  isFlapjack,
  onCancel,
  onUndoCancel,
  isUndoCancelLoading,
}) => {
  console.log("subscription", subscription);
  // First check if subscription is cancelled regardless of status
  if (isCancelled(subscription)) {
    if (isPendingCancellation(subscription)) {
      if (isFlapjack) {
        return (
          <PendingCancellationCard
            subscription={subscription}
            onEdit={onEdit}
            onUndoCancel={onUndoCancel}
            isFlapjack={isFlapjack}
            isUndoCancelLoading={isUndoCancelLoading}
          />
        );
      }
    }
    // If cancelled, always show cancelled card
    return (
      <CanceledSubscriptionCard
        subscription={subscription}
        onEdit={onEdit}
        isFlapjack={isFlapjack}
        onReactivate={onReactivate}
      />
    );
  }

  // Only process non-cancelled subscriptions below this point

  // Handle trial status first
  if (
    subscription.status === "trialing" &&
    subscription.trial_activated &&
    subscription.trial_end_date
  ) {
    return (
      <TrialSubscriptionCard
        subscription={subscription}
        onEdit={onEdit}
        isFlapjack={isFlapjack}
        onCancel={onCancel}
      />
    );
  }

  // Handle other statuses
  switch (subscription.status) {
    case "active":
      return (
        <ActiveSubscriptionCard
          subscription={subscription}
          onEdit={onEdit}
          isFlapjack={isFlapjack}
          onCancel={onCancel}
        />
      );
    case "past_due":
      return (
        <PastDueSubscriptionCard
          subscription={subscription}
          onEdit={onEdit}
          isFlapjack={isFlapjack}
          onCancel={onCancel}
        />
      );
    case "incomplete":
    case "unpaid":
    case "payment_failed":
    case "failed":
      return (
        <FailedPaymentCard subscription={subscription} onEdit={onEdit} isFlapjack={isFlapjack} />
      );
    default:
      return (
        <InactiveSubscriptionCard
          subscription={subscription}
          onEdit={onEdit}
          isFlapjack={isFlapjack}
        />
      );
  }
};
