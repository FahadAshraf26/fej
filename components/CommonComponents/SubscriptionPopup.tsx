import React from "react";
import { Box, Container, Paper, Stack, Text, Title, Button } from "@mantine/core";
import { IconLock, IconCreditCard } from "@tabler/icons";

interface SubscriptionPopupProps {
  type: "subscription-required" | "payment-issues";
  variant?: "default" | "compact" | "full";
}

const SubscriptionPopup: React.FC<SubscriptionPopupProps> = ({ type, variant = "default" }) => {
  const handleTalkToSales = () => {
    window.location.href = "https://www.flapjack.co/contact";
  };

  const config = {
    "subscription-required": {
      icon: IconLock,
      title: "Subscription Required",
      message:
        "This menu is only available to subscribers. Please contact our sales team to get access to this menu.",
      primaryColor: "linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)",
      secondaryColor: "#ff6b35",
    },
    "payment-issues": {
      icon: IconCreditCard,
      title: "Payment Update Required",
      message:
        "Please update your payment method to continue. Contact support to resolve payment issues.",
      primaryColor: "linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)",
      secondaryColor: "#e74c3c",
    },
  };

  const currentConfig = config[type];
  const IconComponent = currentConfig.icon;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <Container size="sm">
        <Paper
          shadow="xl"
          p="xl"
          radius="lg"
          withBorder
          sx={{
            maxWidth: "450px",
            width: "100%",
            margin: "0 auto",
            background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
            border: "1px solid #e9ecef",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative background element */}
          {/* <Box
            sx={{
              position: "absolute",
              top: -20,
              right: -20,
              width: 100,
              height: 100,
              background: currentConfig.primaryColor,
              borderRadius: "50%",
              opacity: 0.1,
            }}
          /> */}

          <Stack align="center" spacing="xl">
            {/* Icon with background */}
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: currentConfig.primaryColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "10px",
              }}
            >
              <IconComponent size={40} color="white" />
            </Box>

            <Title
              order={2}
              align="center"
              sx={{
                color: "#2c3e50",
                fontWeight: 700,
                fontSize: "28px",
                marginBottom: "10px",
              }}
            >
              {currentConfig.title}
            </Title>

            <Text
              align="center"
              color="dimmed"
              sx={{
                fontSize: "16px",
                lineHeight: 1.6,
                color: "#6c757d",
                maxWidth: "350px",
              }}
            >
              {currentConfig.message}
            </Text>

            {/* Single action button */}
            <Button
              variant="filled"
              size="lg"
              onClick={handleTalkToSales}
              sx={{
                background: currentConfig.primaryColor,
                border: "none",
                borderRadius: "8px",
                fontWeight: 600,
                padding: "16px 32px",
                fontSize: "16px",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: `0 8px 25px ${currentConfig.secondaryColor}40`,
                },
                transition: "all 0.3s ease",
              }}
            >
              Talk to Sales
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};

export default SubscriptionPopup;
