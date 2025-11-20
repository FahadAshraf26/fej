import React, { useState } from "react";
import { useMantineTheme, Stack, Badge, Text, Button, Group, Box } from "@mantine/core";
import { IconCreditCard } from "@tabler/icons";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { BaseSubscriptionCard } from "./BaseSubscriptionCard";
import { SubscriptionCardProps } from "../types";

export const FailedPaymentCard: React.FC<SubscriptionCardProps> = (props) => {
  const theme = useMantineTheme();
  const router = useRouter();
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const { subscription } = props;

  const handleUpdatePayment = async (subscription_id: string) => {
    try {
      setIsUpdatingPayment(true);
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          returnUrl: router.asPath,
          subscription_id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create portal session");
      }

      const data = await response.json();
      window.location.href = data.url;
    } catch (error) {
      console.error("Error creating portal session:", error);
      toast.error("Failed to update payment method. Please try again.");
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  // Custom implementation for Failed Payment card since it has a unique layout
  return (
    <BaseSubscriptionCard
      {...props}
      statusLabel="PAYMENT STATUS"
      statusBadge="PAYMENT FAILED"
      dateLabel="Next Payment Attempt"
      hideEditButton
      hideDescription
      styleProps={{
        cardBackground: "linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)",
        statusColor: theme.colors.red[6],
        statusBgColor: theme.colors.red[0],
        priceColor: theme.colors.red[7],
        editBtnColor: theme.colors.red[6],
        editBtnBgColor: "white",
      }}
      additionalSection={
        <Text size="sm" color="red" mt={2}>
          Your last payment attempt failed. Please update your payment method to continue using the
          service.
        </Text>
      }
      footerContent={
        <Button
          fullWidth
          color="red"
          onClick={() => handleUpdatePayment(subscription.id)}
          loading={isUpdatingPayment}
          leftIcon={<IconCreditCard size={16} />}
          mt={8}
        >
          Update Payment Method
        </Button>
      }
    />
  );
};
