import React, { useState } from "react";
import {
  Text,
  Stack,
  Textarea,
  Box,
  Divider,
  useMantineTheme,
  Alert,
  Paper,
  Group,
  Badge,
  Input,
} from "@mantine/core";
import { toast } from "react-toastify";
import { Subscription } from "./types";
import { formatPrice, formatDate } from "../../../utils/helpers";
import CommonModal from "../../CommonComponents/Modal";
import {
  IconCreditCard,
  IconCalendarEvent,
  IconInfoCircle,
  IconAlertTriangle,
  IconAlertOctagon,
} from "@tabler/icons";

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: Subscription | null;
  onSuccess: () => void;
}

export const CancelSubscriptionModal: React.FC<CancelSubscriptionModalProps> = ({
  isOpen,
  onClose,
  subscription,
  onSuccess,
}) => {
  const theme = useMantineTheme();
  const [cancellationReason, setCancellationReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!subscription) {
    return null;
  }

  const handleCancel = async () => {
    if (!cancellationReason.trim()) {
      setError("Please provide a reason for cancellation");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const response = await fetch(`/api/billing/subscriptions/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptionId: subscription.stripe_subscription_id,
          reason: cancellationReason.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to cancel subscription");
      }

      await response.json();
      toast.success("Subscription was successfully canceled");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error canceling subscription:", error);
      toast.error("Failed to cancel subscription. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const effectiveEndDate = subscription.current_period_end
    ? formatDate(subscription.current_period_end)
    : "Not available";

  return (
    <CommonModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <Group spacing="xs">
          <IconAlertTriangle size={22} color={theme.colors.red[6]} />
          <Text weight={700} size="xl">
            Cancel Subscription
          </Text>
        </Group>
      }
      size="600px"
      submitLabel="Confirm Cancellation"
      submitLabelColor="red"
      onSubmit={handleCancel}
      loading={isLoading}
      disabled={!cancellationReason.trim()}
      maxHeight="90vh"
    >
      <Stack spacing={28}>
        <Paper
          p="lg"
          radius="lg"
          shadow="md"
          sx={{
            background:
              theme.colorScheme === "dark" ? theme.fn.rgba(theme.colors.dark[6], 0.7) : theme.white,
            borderLeft: `4px solid ${theme.colors.teal[5]}`,
            minWidth: 0,
          }}
        >
          <Group position="apart" align="flex-start" mb={4}>
            <Box>
              <Group spacing={8} mb={2}>
                <IconCreditCard size={22} color={theme.colors.orange[6]} />
                <Text weight={700} size="lg">
                  {subscription.plans.name}
                </Text>
              </Group>
              <Text size="sm" color="dimmed" ml={30} style={{ lineHeight: 1.5 }}>
                {subscription.plans.description}
              </Text>
            </Box>
            <Badge
              size="md"
              variant="light"
              color="orange"
              sx={{
                backgroundColor: theme.fn.rgba(theme.colors.orange[1], 0.25),
                fontWeight: 600,
                letterSpacing: 0.5,
                fontSize: 13,
                padding: "0 12px",
              }}
            >
              ACTIVE
            </Badge>
          </Group>
          <Divider my={12} />
          <Group spacing={40} noWrap>
            <Box>
              <Group spacing={6} mb={2}>
                <IconCalendarEvent size={18} color={theme.colors.gray[6]} />
                <Text size="sm" weight={500} color="dimmed">
                  Monthly Payment
                </Text>
              </Group>
              <Text size="lg" weight={700} ml={24} color={theme.colors.gray[9]}>
                {formatPrice(subscription.plans.price, subscription.plans.currency)}
              </Text>
            </Box>
            <Box>
              <Group spacing={6} mb={2}>
                <IconCalendarEvent size={18} color={theme.colors.gray[6]} />
                <Text size="sm" weight={500} color="dimmed">
                  Next Billing Date
                </Text>
              </Group>
              <Text size="lg" weight={700} ml={24} color={theme.colors.gray[9]}>
                {effectiveEndDate}
              </Text>
            </Box>
          </Group>
        </Paper>

        <Alert
          icon={<IconAlertOctagon size={20} />}
          title={
            <Text weight={600} color={theme.colors.orange[7]}>
              Important Information
            </Text>
          }
          color="orange"
          variant="light"
          sx={{
            backgroundColor: theme.fn.rgba(theme.colors.orange[0], 0.18),
            borderColor: theme.fn.rgba(theme.colors.orange[3], 0.5),
            fontSize: 15,
            borderRadius: 10,
            padding: "18px 20px",
          }}
        >
          <Text size="sm" mb={4}>
            Your subscription will remain active until <b>{effectiveEndDate}</b>. After this date,
            you will lose access to all subscription features.
          </Text>
          <Text size="sm">
            If you change your mind, you can reactivate the subscription before the end date.
          </Text>
        </Alert>

        <Box>
          <Input.Label
            required
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 6,
              fontWeight: 500,
              fontSize: 15,
            }}
          >
            <IconInfoCircle size={18} color={theme.colors.blue[6]} />
            Reason for cancellation
          </Input.Label>
          <Textarea
            label=""
            placeholder="Please let us know why you're canceling..."
            value={cancellationReason}
            onChange={(e) => {
              setCancellationReason(e.target.value);
              setError("");
            }}
            minRows={3}
            error={error}
            required
            styles={{
              input: {
                borderColor: error ? theme.colors.red[6] : theme.colors.gray[3],
                borderRadius: 8,
                background:
                  theme.colorScheme === "dark"
                    ? theme.fn.rgba(theme.colors.dark[5], 0.2)
                    : theme.fn.rgba(theme.colors.gray[0], 0.5),
                fontSize: 15,
                padding: "10px 12px",
                transition: "border-color 0.2s",
                ...(error ? { boxShadow: `0 0 0 1px ${theme.colors.red[6]}` } : {}),
              },
            }}
          />
        </Box>
      </Stack>
    </CommonModal>
  );
};
