import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Text, Button, Group, Stack, Paper, Badge, SimpleGrid, Box, Loader } from "@mantine/core";
import { IconPlus } from "@tabler/icons";
import { useUser } from "@Hooks/useUser";
import { toast } from "react-toastify";
import { SubscriptionTabProps, Subscription, Plan, UserSubscriptions } from "./types";
import { EmptySubscriptionState } from "./cards/EmptySubscriptionState";
import { CreateSubscriptionModal } from "./CreateSubscriptionModal";
import { CancelSubscriptionModal } from "./CancelSubscriptionModal";
import { SubscriptionCard } from "./cards/index";
import { SubscriptionStats, isCancelled } from "./SubscriptionStats";
import { SubscriptionService } from "../../../services/SubscriptionService";

const isPendingCancellation = (subscription: Subscription): boolean => {
  return (
    subscription.status === "active" &&
    subscription.is_active === true &&
    (!!subscription.cancel_at || !!subscription.canceled_at)
  );
};

// Constants
const SUBSCRIPTION_STATUS_ORDER: Record<string, number> = {
  active: 0,
  trialing: 1,
  payment_failed: 2,
  past_due: 3,
  failed: 4,
  incomplete: 4,
  unpaid: 4,
  pending_cancellation: 5,
  canceled: 6,
} as const;

// Helper function to get the effective status for sorting
const getEffectiveStatus = (subscription: Subscription): string => {
  // Check for pending cancellation first (this is a computed status)
  if (isPendingCancellation(subscription)) {
    return "pending_cancellation";
  }

  // Check if cancelled (using the same logic as SubscriptionCard)
  const canceledAt = subscription.canceled_at || subscription.cancelled_at;
  const isCancelledStatus =
    subscription.status === "canceled" || !!subscription.cancel_at || !!canceledAt;

  if (isCancelledStatus) {
    return "canceled";
  }

  // Return the actual status
  return subscription.status;
};

const sortSubscriptions = (a: Subscription, b: Subscription): number => {
  // Get effective status for both subscriptions first
  const aEffectiveStatus = getEffectiveStatus(a);
  const bEffectiveStatus = getEffectiveStatus(b);

  // Sort by status order first (this ensures payment_failed comes before canceled)
  const aOrder = SUBSCRIPTION_STATUS_ORDER[aEffectiveStatus] ?? 6;
  const bOrder = SUBSCRIPTION_STATUS_ORDER[bEffectiveStatus] ?? 6;

  if (aOrder !== bOrder) {
    return aOrder - bOrder;
  }

  // If same status order, then sort by is_active (active first)
  if (a.is_active !== b.is_active) {
    return a.is_active ? -1 : 1;
  }

  return 0;
};

const filterSubscriptionsByFeature = (
  subscriptions: Subscription[],
  filterFn: (sub: Subscription) => boolean
) => subscriptions.filter(filterFn).sort(sortSubscriptions);

// Custom hooks
const useSubscriptions = (restaurantId: string) => {
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadSubscriptions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSubscriptions([]);

      // Add a longer delay to ensure backend has processed the changes
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const response = await fetch(`/api/restaurants/${restaurantId}/owner`);
      if (!response.ok) {
        throw new Error(`Failed to fetch subscriptions: ${response.status}`);
      }

      const data = await response.json();
      setSubscriptions([...(data.subscriptions || [])]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load subscriptions";
      console.error("Error loading subscriptions:", error);
      setError(errorMessage);
      toast.error("Failed to load subscriptions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  return { subscriptions, isLoading, error, loadSubscriptions };
};

// Component
export const SubscriptionTab = ({ restaurantId }: SubscriptionTabProps) => {
  const userDetails = useUser();
  const { subscriptions, isLoading, loadSubscriptions } = useSubscriptions(restaurantId);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isUndoCancelLoading, setIsUndoCancelLoading] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [defaultPlan, setDefaultPlan] = useState<Plan | null>(null);

  // Computed values
  const isFlapjack = userDetails?.role === "flapjack";
  const hasActiveSubscriptions = SubscriptionService.hasActiveEditorSubscription(subscriptions);

  const subscriptionsByUser = useMemo(() => {
    // First, group subscriptions by user
    const grouped = subscriptions.reduce<Record<string, UserSubscriptions>>((acc, subscription) => {
      const userId = subscription.profiles.id;
      if (!acc[userId]) {
        acc[userId] = {
          user: subscription.profiles,
          subscriptions: [],
        };
      }
      acc[userId].subscriptions.push(subscription);
      return acc;
    }, {});

    // Convert to array and sort users based on their subscription statuses
    const sortedUserSubscriptions = Object.values(grouped).sort((a, b) => {
      // Get the worst status for each user (highest priority number = worst status)
      const getWorstStatusOrder = (userSubs: UserSubscriptions): number => {
        if (userSubs.subscriptions.length === 0) return 6; // Default to canceled priority

        return Math.max(
          ...userSubs.subscriptions.map((sub) => {
            const effectiveStatus = getEffectiveStatus(sub);
            return SUBSCRIPTION_STATUS_ORDER[effectiveStatus] ?? 6;
          })
        );
      };

      const aWorstStatus = getWorstStatusOrder(a);
      const bWorstStatus = getWorstStatusOrder(b);

      // Sort by worst status first (lower number = higher priority)
      return aWorstStatus - bWorstStatus;
    });

    // Convert back to object with sorted order
    return sortedUserSubscriptions.reduce<Record<string, UserSubscriptions>>((acc, userSub) => {
      acc[userSub.user.id] = userSub;
      return acc;
    }, {});
  }, [subscriptions]);

  // Event handlers
  const handleAddSubscription = useCallback((plan?: Plan) => {
    setDefaultPlan(plan || null);
    setIsCreateModalOpen(true);
  }, []);

  const handleEditSubscription = useCallback((subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setIsEditModalOpen(true);
  }, []);

  const handleCancelSubscription = useCallback((subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setIsCancelModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setIsCancelModalOpen(false);
    setSelectedSubscription(null);
    setDefaultPlan(null);
  }, []);

  // Success callback wrapper with better feedback
  const handleSuccess = useCallback(async () => {
    try {
      await loadSubscriptions();
      // Additional feedback could be added here if needed
    } catch (error) {
      console.error("Error refreshing subscriptions:", error);
      toast.error("Subscription updated but failed to refresh the list. Please refresh the page.");
    }
  }, [loadSubscriptions]);

  // Specific handler for subscription creation with retry logic
  const handleSubscriptionCreated = useCallback(async () => {
    try {
      // First attempt after 2 seconds
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await loadSubscriptions();

      // If still no new subscription, try again after 3 more seconds
      setTimeout(async () => {
        try {
          await loadSubscriptions();
        } catch (error) {
          console.error("Retry refresh failed:", error);
        }
      }, 3000);
    } catch (error) {
      console.error("Error refreshing subscriptions after creation:", error);
      toast.error("Subscription created but failed to refresh the list. Please refresh the page.");
    }
  }, [loadSubscriptions]);

  const handleUndoCancellation = useCallback(
    async (subscription: Subscription) => {
      try {
        setIsUndoCancelLoading(true);

        const response = await fetch(`/api/billing/subscriptions/undo-cancel`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subscriptionId: subscription.stripe_subscription_id,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to undo subscription cancellation: ${response.status}`);
        }

        await handleSuccess();
        toast.success("Cancellation has been reversed. Your subscription will continue as normal.");
      } catch (error) {
        console.error("Error undoing cancellation:", error);
        toast.error("Failed to undo cancellation. Please try again or contact support.");
      } finally {
        setIsUndoCancelLoading(false);
      }
    },
    [handleSuccess]
  );

  const handleReactivateSubscription = useCallback(
    (plan: Plan) => {
      handleAddSubscription(plan);
    },
    [handleAddSubscription]
  );

  // Render loading state
  if (isLoading) {
    return (
      <Box
        sx={{
          height: "calc(100vh - 200px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader variant="dots" size="lg" />
      </Box>
    );
  }

  // Render empty state
  if (Object.keys(subscriptionsByUser).length === 0) {
    return (
      <EmptySubscriptionState
        onAddSubscription={() => handleAddSubscription()}
        userRole={userDetails?.role}
      />
    );
  }

  return (
    <Stack spacing="xl">
      {/* Subscription Overview */}
      {isFlapjack && (
        <>
          <Group position="right">
            <Button
              leftIcon={<IconPlus size={16} />}
              color="orange"
              onClick={() => handleAddSubscription()}
            >
              Add Subscription
            </Button>
          </Group>
        </>
      )}
      <SubscriptionStats subscriptions={subscriptions} />
      {/* User Subscriptions */}
      {Object.values(subscriptionsByUser).map(({ user, subscriptions: userSubscriptions }) => (
        <Paper key={user.id} p="md" radius="md" withBorder>
          <Stack spacing="md">
            <Group position="apart">
              <Stack spacing={4}>
                <Text weight={500} size="lg">
                  {user.first_name} {user.last_name}
                </Text>
                <Text size="sm" color="dimmed">
                  {user.email}
                </Text>
              </Stack>
            </Group>

            <SimpleGrid cols={2} spacing="md">
              {/* Column 1: Subscriptions with 'tier' in features */}
              <Stack>
                {filterSubscriptionsByFeature(
                  userSubscriptions,
                  (sub) => sub.plans.features && sub.plans.features.tier
                ).map((subscription) => (
                  <Box key={subscription.id}>
                    <SubscriptionCard
                      subscription={subscription}
                      onEdit={() => handleEditSubscription(subscription)}
                      onReactivate={() => handleReactivateSubscription(subscription.plans)}
                      onCancel={handleCancelSubscription}
                      onUndoCancel={handleUndoCancellation}
                      isFlapjack={isFlapjack}
                      isUndoCancelLoading={isUndoCancelLoading}
                    />
                  </Box>
                ))}
              </Stack>

              {/* Column 2: Subscriptions with features.type === 'editor' */}
              <Stack>
                {filterSubscriptionsByFeature(
                  userSubscriptions,
                  (sub) => sub.plans.features && sub.plans.features.type === "editor"
                ).map((subscription) => (
                  <Box key={subscription.id}>
                    <SubscriptionCard
                      subscription={subscription}
                      onEdit={() => handleEditSubscription(subscription)}
                      onReactivate={() => handleReactivateSubscription(subscription.plans)}
                      onCancel={handleCancelSubscription}
                      onUndoCancel={handleUndoCancellation}
                      isFlapjack={isFlapjack}
                      isUndoCancelLoading={isUndoCancelLoading}
                    />
                  </Box>
                ))}
              </Stack>
            </SimpleGrid>

            {userSubscriptions.length === 0 && isFlapjack && hasActiveSubscriptions && (
              <Button color="orange" fullWidth onClick={() => handleAddSubscription()}>
                Add Subscription
              </Button>
            )}
          </Stack>
        </Paper>
      ))}

      {/* Subscription Creation/Edit Modal */}
      <CreateSubscriptionModal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={closeModal}
        restaurantId={restaurantId}
        onSuccess={isCreateModalOpen ? handleSubscriptionCreated : handleSuccess}
        subscription={selectedSubscription as any}
        defaultPlan={defaultPlan}
      />

      {/* Subscription Cancellation Modal */}
      <CancelSubscriptionModal
        isOpen={isCancelModalOpen}
        onClose={closeModal}
        subscription={selectedSubscription}
        onSuccess={handleSuccess}
      />
    </Stack>
  );
};
