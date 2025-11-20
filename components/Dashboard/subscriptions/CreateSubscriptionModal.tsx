import { useState, useEffect } from "react";
import {
  Button,
  Group,
  Stack,
  Select,
  Text,
  Switch,
  Paper,
  Divider,
  Alert,
  Box,
  CopyButton,
  TextInput,
} from "@mantine/core";
import { usePlanStore } from "@Stores/billing/Plan.store";
import CommonModal from "@Components/CommonComponents/Modal";
import { IconExternalLink, IconCheck, IconCopy } from "@tabler/icons";
import { toast } from "react-toastify";
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
  const [checkoutLink, setCheckoutLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
    setCheckoutLink(null);

    try {
      if (subscription) {
        // Update existing subscription
        const selectedPlanData = plans.find((plan: Plan) => plan.id === selectedPlan);
        if (!selectedPlanData) throw new Error("Selected plan not found");

        await updateSubscription(subscription.stripe_subscription_id, selectedPlanData);
        onSuccess();
        onClose();
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
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to create subscription: ${response.status}`);
        }

        const result = await response.json();

        // Check if the result is a checkout link (string) or subscription object
        if (typeof result === "string" && result.includes("/subscription/")) {
          // It's a checkout link
          setCheckoutLink(result);
          toast.success("Checkout link generated successfully!");
        } else if (result.id && result.status) {
          // It's a subscription object
          toast.success("Subscription created successfully!");
          onSuccess();
          onClose();
        } else {
          // Unexpected response format
          throw new Error("Unexpected response format from server");
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create subscription";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Error handling subscription:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCheckoutLink(null);
    setError(null);
    onClose();
  };

  const selectedPlanDetails = plans.find((plan: Plan) => plan.id === selectedPlan);
  const isFlapjackEditor = selectedPlanDetails?.name === "Flapjack Editor Subscription";
  const isBasicPlan = selectedPlanDetails?.price === 4900; // $49.00
  const canHaveTrial = !isFlapjackEditor && !isBasicPlan;

  return (
    <CommonModal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        checkoutLink
          ? "Update Payment Link Generated"
          : subscription
          ? "Edit Subscription"
          : "Create New Subscription"
      }
      size="lg"
      submitLabel={
        checkoutLink ? "Close" : subscription ? "Update Subscription" : "Create Subscription"
      }
      submitLabelColor="orange"
      onSubmit={checkoutLink ? handleClose : handleCreateSubscription}
      loading={isLoading}
      disabled={!selectedPlan && !checkoutLink}
    >
      <Stack spacing={18} style={{ padding: "8px 0 0 0", minWidth: 400 }}>
        {/* Error Display */}
        {error && (
          <Alert color="red" title="Error">
            {error}
          </Alert>
        )}

        {/* Checkout Link Display */}
        {checkoutLink && (
          <Box>
            <Alert color="blue" title="Update Payment Link Generated" mb="md">
              A checkout link has been generated because the customer&apos;s current payment method is not valid. Customers must have a valid payment method attached in order to add a new subscription.
            </Alert>

            <Paper p="md" withBorder>
              <Stack spacing="sm">
                <Text size="sm" weight={500} color="dimmed">
                  Checkout Link:
                </Text>
                <Box
                  sx={{
                    backgroundColor: "#f8f9fa",
                    border: "1px solid #dee2e6",
                    borderRadius: "4px",
                    padding: "8px 12px",
                    fontFamily: "monospace",
                    fontSize: "12px",
                    wordBreak: "break-all",
                    maxHeight: "60px",
                    overflow: "auto",
                  }}
                >
                  {checkoutLink}
                </Box>
                <Group spacing="xs">
                  <CopyButton value={checkoutLink}>
                    {({ copied, copy }) => (
                      <Button
                        size="xs"
                        variant="outline"
                        leftIcon={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                        onClick={copy}
                      >
                        {copied ? "Copied!" : "Copy Link"}
                      </Button>
                    )}
                  </CopyButton>
                  <Button
                    size="xs"
                    variant="outline"
                    leftIcon={<IconExternalLink size={14} />}
                    onClick={() => window.open(checkoutLink, "_blank")}
                  >
                    Open Link
                  </Button>
                </Group>
              </Stack>
            </Paper>
          </Box>
        )}

        {/* Plan Selection (only show if not displaying checkout link) */}
        {!checkoutLink && (
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
                subscription && plan.id === subscription.plans.id
                  ? { color: "#adb5bd" }
                  : undefined,
            }))}
            required
            styles={{
              root: { marginBottom: 10 },
            }}
          />
        )}

        {!checkoutLink && selectedPlanDetails && (
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

        {!checkoutLink && !subscription && selectedPlanDetails && canHaveTrial && (
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
