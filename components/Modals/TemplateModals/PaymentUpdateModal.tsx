import React, { useCallback, useState } from "react";
import { Box, Text, Flex, Alert, Button, Group } from "@mantine/core";
import { IconAlertCircle, IconPhone } from "@tabler/icons";
import CommonModal from "../../CommonComponents/Modal";
import { useRouter } from "next/router";
import { useSubscriptionContext } from "../../../context/SubscriptionContext";
import { SubscriptionService } from "../../../services/SubscriptionService";

interface PaymentUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnUrl?: string;
}

const PaymentUpdateModal: React.FC<PaymentUpdateModalProps> = ({ isOpen, onClose, returnUrl }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { restaurantSubscriptions } = useSubscriptionContext();

  const failingSubscriptions =
    restaurantSubscriptions?.filter((sub) => SubscriptionService.isEditorSubscription(sub) && SubscriptionService.hasPaymentIssues(sub)) || [];
  const activeSubscriptions =
    restaurantSubscriptions?.filter((sub) => SubscriptionService.isEditorSubscription(sub) && SubscriptionService.isSubscriptionActive(sub)) || [];

  const hasNoSubscriptions = !SubscriptionService.hasAnySubscriptions(restaurantSubscriptions);
  const handleUpdatePayment = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ returnUrl, subscription_id: failingSubscriptions[0].id }),
      });

      if (!response.ok) {
        throw new Error("Failed to create portal session");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Error creating portal session:", error);
      setError("Failed to update payment method. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [returnUrl]);

  const handleTalkToSales = () => {
    window.location.href = "https://www.flapjack.co/contact";
  };

  // Custom modal title with icon
  const modalTitle = (
    <Flex align="center" gap="xs">
      <IconAlertCircle size={24} color="#ff9800" />
      <Text size="lg" weight={600}>
        {hasNoSubscriptions ? "No Active Subscription" : "Action Required"}
      </Text>
    </Flex>
  );

  return (
    <CommonModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      submitLabel={hasNoSubscriptions ? "Talk to Sales" : "Update Payment"}
      submitLabelColor="orange"
      onSubmit={hasNoSubscriptions ? handleTalkToSales : handleUpdatePayment}
      loading={isLoading}
    >
      <Box sx={{ width: "100%", padding: "16px 0" }}>
        <Text align="center" size="md" mb="md">
          {hasNoSubscriptions
            ? "You don't have an active subscription. Contact our sales team to get started with Flapjack."
            : "Your subscription requires attention. Please update your payment method to continue using Flapjack services."}
        </Text>

        <Alert icon={<IconAlertCircle size={16} />} color="orange" variant="light">
          <Text size="sm">
            {hasNoSubscriptions
              ? "You will be redirected to schedule a call with our sales team."
              : "You will be redirected to our secure payment portal to update your payment information."}
          </Text>
        </Alert>

        {error && (
          <Text color="red" size="sm" mt="xs">
            {error}
          </Text>
        )}
      </Box>
    </CommonModal>
  );
};

export default PaymentUpdateModal;
