import React, { useMemo } from "react";
import { Text, Group, Stack, Paper } from "@mantine/core";
import { StatItemProps, Subscription, SubscriptionStatsProps } from "./types";
import { SubscriptionService } from "../../../services/SubscriptionService";

// Constants
const PAYMENT_ISSUE_STATUSES = [
  "past_due",
  "failed",
  "incomplete",
  "unpaid",
  "payment_failed",
] as const;

// Helper functions
const hasPaymentIssue = (status: string): boolean =>
  PAYMENT_ISSUE_STATUSES.includes(status as (typeof PAYMENT_ISSUE_STATUSES)[number]);

const isCancelled = (subscription: Subscription): boolean => {
  const canceledAt = subscription.canceled_at || subscription.cancelled_at;
  const result = subscription.status === "canceled" || !!subscription.cancel_at || !!canceledAt;
  return result;
};

// Use centralized subscription service instead of custom logic

// Custom hook for subscription statistics - Editor subscriptions only
const useSubscriptionStats = (subscriptions: Subscription[]) => {
  return useMemo(() => {
    // Filter to only Editor subscriptions
    const editorSubscriptions = subscriptions.filter(sub => SubscriptionService.isEditorSubscription(sub));
    
    const stats = editorSubscriptions.reduce(
      (acc, subscription) => {
        if (SubscriptionService.isTrialing(subscription)) {
          acc.trialCount++;
        }
        if (SubscriptionService.isSubscriptionActive(subscription)) {
          acc.activeCount++;
        }
        if (SubscriptionService.hasPaymentIssues(subscription)) {
          acc.paymentIssuesCount++;
        }
        if (isCancelled(subscription)) {
          acc.cancelledCount++;
        }
        if (SubscriptionService.isSubscriptionActive(subscription)) {
          acc.monthlyRevenue += subscription.plans?.price || 0;
        }
        return acc;
      },
      {
        trialCount: 0,
        activeCount: 0,
        paymentIssuesCount: 0,
        cancelledCount: 0,
        monthlyRevenue: 0,
      }
    );

    return {
      ...stats,
      hasActiveSubscriptions: SubscriptionService.hasActiveEditorSubscription(subscriptions),
      formattedMonthlyRevenue: (stats.monthlyRevenue / 100).toFixed(2),
    };
  }, [subscriptions]);
};

const StatItem: React.FC<StatItemProps> = ({ value, label, color }) => (
  <Stack align="center" spacing={0}>
    <Text size="xl" weight={700} color={color}>
      {value}
    </Text>
    <Text size="sm" color="dimmed">
      {label}
    </Text>
  </Stack>
);

// Main component
export const SubscriptionStats: React.FC<SubscriptionStatsProps> = ({ subscriptions }) => {
  const stats = useSubscriptionStats(subscriptions);

  // Don't render if there are no active subscriptions
  if (!stats.hasActiveSubscriptions) {
    return null;
  }

  return (
    <Paper p="md" radius="md" withBorder mb="md">
      <Group position="apart" spacing="xl" grow>
        <StatItem value={stats.trialCount} label="TRIAL SUBSCRIPTIONS" color="blue" />
        <StatItem value={stats.activeCount} label="ACTIVE SUBSCRIPTIONS" color="teal" />
        <StatItem value={stats.paymentIssuesCount} label="PAYMENT ISSUES" color="red" />
        <StatItem value={stats.cancelledCount} label="CANCELLED" />
        <StatItem
          value={`$${stats.formattedMonthlyRevenue}`}
          label="MONTHLY REVENUE"
          color="teal"
        />
      </Group>
    </Paper>
  );
};

// Export helper functions and hook for potential reuse
export { useSubscriptionStats, hasPaymentIssue, isCancelled };
