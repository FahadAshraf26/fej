import { useState } from "react";
import {
  Modal,
  Text,
  Button,
  Group,
  Select,
  Stack,
  Switch,
  NumberInput,
  Paper,
  Badge,
  useMantineTheme,
} from "@mantine/core";
import { usePlanStore } from "../../stores/billing/Plan.store";
import { TRIAL_DAYS } from "@Config/app-settings";

interface UpdateSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  currentSubscription: any;
  onSuccess: () => void;
}

export const UpdateSubscriptionModal = ({
  isOpen,
  onClose,
  restaurantId,
  currentSubscription,
  onSuccess,
}: UpdateSubscriptionModalProps) => {
  const theme = useMantineTheme();
  const { plans } = usePlanStore();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(
    currentSubscription?.plan_id || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [enableTrial, setEnableTrial] = useState(false);
  const [trialDays, setTrialDays] = useState<number>(TRIAL_DAYS);

  const handleUpdateSubscription = async () => {
    if (!selectedPlan) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/billing/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: selectedPlan,
          enableTrial,
          trialDays,
          restaurantId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update subscription");
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error updating subscription:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal opened={isOpen} onClose={onClose} title="Update Subscription" size="lg">
      <Stack spacing="xl">
        <Select
          label="Select New Plan"
          placeholder="Choose a plan"
          value={selectedPlan}
          onChange={setSelectedPlan}
          data={plans.map((plan) => ({
            value: plan.id,
            label: plan.name,
          }))}
          required
        />

        {selectedPlan && (
          <Paper p="md" radius="md" withBorder>
            <Stack spacing="xs">
              <Group position="apart">
                <Text weight={500}>Plan Details</Text>
                <Badge size="lg" color="blue">
                  {plans.find((p) => p.id === selectedPlan)?.name}
                </Badge>
              </Group>
              <Text size="sm" color="dimmed">
                {plans.find((p) => p.id === selectedPlan)?.description}
              </Text>
              <Group spacing="xs" align="center">
                <Text weight={700} size="xl" color="orange">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format((plans.find((p) => p.id === selectedPlan)?.price || 0) / 100)}
                </Text>
                <Text size="sm" color="dimmed" mt={4}>
                  /month
                </Text>
              </Group>
            </Stack>
          </Paper>
        )}

        <Switch
          label="Enable Trial Period"
          checked={enableTrial}
          onChange={(event) => setEnableTrial(event.currentTarget.checked)}
        />

        {enableTrial && (
          <NumberInput
            label="Trial Duration (days)"
            value={trialDays}
            onChange={(val) => setTrialDays(val || TRIAL_DAYS)}
            min={1}
            max={30}
            required
          />
        )}

        <Group position="right" mt="xl">
          <Button variant="light" onClick={onClose}>
            Cancel
          </Button>
          <Button
            color="orange"
            onClick={handleUpdateSubscription}
            loading={isLoading}
            disabled={!selectedPlan}
          >
            Update Subscription
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
