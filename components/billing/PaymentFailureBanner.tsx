import React from "react";
import { Alert, Button, Group, Text, Box } from "@mantine/core";
import { useUserContext } from "@Context/UserContext";
import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { useSubscriptionContext } from "../../context/SubscriptionContext";
import { SubscriptionService } from "../../services/SubscriptionService";
import { IconAlertTriangle } from "@tabler/icons";

const PaymentFailureBanner = ({ isShown }: { isShown: (visible: boolean) => void }) => {
  const { user } = useUserContext();
  const { restaurantSubscriptions, isLoading, restaurantOverride } = useSubscriptionContext();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUpdatePayment = async (subscription_id: string) => {
    try {
      setLoading(true);
      const { data } = await axios.post("/api/billing/portal", {
        returnUrl: router.asPath,
        subscription_id,
      });
      window.location.href = data.url;
    } catch (error) {
      console.error("Error creating portal session:", error);
    } finally {
      setLoading(false);
    }
  };

  // Use centralized subscription status logic with restaurant override support
  const shouldShowBanner = React.useMemo(() => {
    // Don't show for flapjack users or while loading
    if (user?.role === "flapjack" || isLoading) {
      return false;
    }

    // Use the same logic as the main subscription check - includes restaurant override
    const subscriptionStatus = SubscriptionService.getEditorSubscriptionStatus(
      restaurantSubscriptions || [], 
      user?.role === "flapjack", 
      restaurantOverride
    );
    return !subscriptionStatus.canAccessFeatures;
  }, [user?.role, isLoading, restaurantSubscriptions, restaurantOverride]);

  // Update banner visibility using useEffect
  useEffect(() => {
    isShown(shouldShowBanner);
  }, [shouldShowBanner, isShown]);

  // Don't render anything if banner shouldn't be shown
  if (!shouldShowBanner) {
    return null;
  }

  // Show single red banner when no active subscriptions
  return (
    <Box sx={{ position: "relative" }}>
      <Alert
        color="red"
        variant="filled"
        styles={{
          root: {
            borderRadius: 0,
            padding: "16px 24px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            transition: "all 0.2s ease",
            "&:hover": {
              boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
            },
          },
        }}
      >
        <Group position="apart" spacing="xl">
          <Group spacing="sm">
            <IconAlertTriangle size={20} color="white" />
            <Text color="white" size="sm" weight={500}>
              {restaurantSubscriptions?.length === 0
                ? "You don't have an active subscription. Subscribe to continue using Flapjack."
                : "Please update your payment method to keep using Flapjack."}
            </Text>
          </Group>
          {restaurantSubscriptions && restaurantSubscriptions.length > 0 && (
            <Button
              variant="white"
              color="red"
              size="sm"
              onClick={() => handleUpdatePayment(restaurantSubscriptions[0].id)}
              loading={loading}
              sx={{
                transition: "all 0.2s ease",
                "&:hover": {
                  transform: "translateY(-1px)",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                },
              }}
            >
              Update Payment Method
            </Button>
          )}
        </Group>
      </Alert>
    </Box>
  );
};

export default PaymentFailureBanner;
