import { useState, useEffect } from "react";
import { Button, Group, Stack, Select, Text, Switch, Paper, Divider } from "@mantine/core";
import { usePlanStore } from "../../stores/billing/Plan.store";
import CommonModal from "../CommonComponents/Modal";
import { TRIAL_DAYS } from "@Config/app-settings";

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  trialDays?: number;
}

interface CreateSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  onSuccess: () => void;
  subscription?: {
    id: string;
    stripe_subscription_id: string;
    status: string;
    plans: Plan;
    current_period_start: string;
    current_period_end: string;
    trial_end_date: string | null;
    trial_activated: boolean;
  };
  defaultPlan?: Plan | null;
}

export const CreateSubscriptionModal = ({
  isOpen,
  onClose,
  restaurantId,
  onSuccess,
  subscription,
  defaultPlan,
}: CreateSubscriptionModalProps) => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [enableTrial, setEnableTrial] = useState(false);
  const { plans, fetchPlans, updateSubscription } = usePlanStore();

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Set default selected plan
  useEffect(() => {
    if (subscription && subscription.plans) {
      setSelectedPlan(subscription.plans.id);
    } else if (defaultPlan) {
      setSelectedPlan(defaultPlan.id);
    } else if (plans.length > 0) {
      setSelectedPlan(plans[0].id);
    }
  }, [subscription, defaultPlan, plans]);

  const formatPrice = (price: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price / 100);
  };

  const handleCreateSubscription = async () => {
    if (!selectedPlan) return;

    setIsLoading(true);
    try {
      if (subscription) {
        // Update existing subscription
        const selectedPlanData = plans.find((plan: Plan) => plan.id === selectedPlan);
        if (!selectedPlanData) throw new Error("Selected plan not found");

        await updateSubscription(subscription.stripe_subscription_id, selectedPlanData);
      } else {
        // Create new subscription
        const response = await fetch("/api/billing/subscriptions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            planId: selectedPlan,
            enableTrial: enableTrial,
            trialDays: selectedPlanDetails?.trialDays || TRIAL_DAYS,
            restaurantId,
            salesRepSlackId: undefined, // This component doesn't have UI for sales rep slack ID
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create subscription");
        }
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error handling subscription:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPlanDetails = plans.find((plan: Plan) => plan.id === selectedPlan);
  const isFlapjackEditor = selectedPlanDetails?.name === "Flapjack Editor Subscription";
  const isBasicPlan = selectedPlanDetails?.price === 4900; // $49.00
  const canHaveTrial = !isFlapjackEditor && !isBasicPlan;

  return (
    <CommonModal
      isOpen={isOpen}
      onClose={onClose}
      title={subscription ? "Edit Subscription" : "Create New Subscription"}
      size="lg"
      submitLabel={subscription ? "Update Subscription" : "Create Subscription"}
      submitLabelColor="orange"
      onSubmit={handleCreateSubscription}
      loading={isLoading}
      disabled={!selectedPlan}
    >
      <Stack spacing={18} style={{ padding: "8px 0 0 0", minWidth: 400 }}>
        <Select
          label="Select Plan"
          placeholder="Choose a plan"
          value={selectedPlan}
          onChange={setSelectedPlan}
          data={plans.map((plan: Plan) => ({
            value: plan.id,
            label: `${plan.name} - ${formatPrice(plan.price, plan.currency)}/month`,
            disabled: subscription && plan.id === subscription.plans.id,
            style:
              subscription && plan.id === subscription.plans.id ? { color: "#adb5bd" } : undefined,
          }))}
          required
          styles={{
            root: { marginBottom: 10 },
          }}
        />

        {selectedPlanDetails && (
          <Paper
            p="md"
            radius="lg"
            withBorder
            shadow="sm"
            style={{
              marginBottom: 0,
              borderColor: "#ececec",
              minWidth: 0,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <Stack spacing={4}>
              <Text weight={700} size="lg" mb={0} style={{ letterSpacing: 0.1 }}>
                {selectedPlanDetails.name}
              </Text>
              <Text size="sm" color="dimmed" mb={2}>
                {selectedPlanDetails.description}
              </Text>
              <Group spacing={4} align="center">
                <Text weight={700} size="xl" color="orange" style={{ fontSize: 26, lineHeight: 1 }}>
                  {formatPrice(selectedPlanDetails.price, selectedPlanDetails.currency)}
                </Text>
                <Text size="sm" color="dimmed" mt={3}>
                  /month
                </Text>
              </Group>
            </Stack>
          </Paper>
        )}

        {!subscription && selectedPlanDetails && canHaveTrial && (
          <Switch
            label={`Enable ${TRIAL_DAYS}-day trial period`}
            checked={enableTrial}
            onChange={(event) => setEnableTrial(event.currentTarget.checked)}
            style={{ alignSelf: "flex-start", marginTop: 2, marginBottom: 2 }}
          />
        )}
      </Stack>
    </CommonModal>
  );
};
