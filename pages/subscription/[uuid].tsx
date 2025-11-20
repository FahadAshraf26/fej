import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import {
  Container,
  Paper,
  Text,
  Button,
  Group,
  Stack,
  Center,
  Loader,
  Badge,
  Box,
  ThemeIcon,
  keyframes,
} from "@mantine/core";
import { IconLock, IconX } from "@tabler/icons";
import Logo from "../../public/logo.svg";

// Keyframes for animations
const wiggle = keyframes({
  "0%, 100%": { transform: "rotate(5deg)" },
  "50%": { transform: "rotate(-5deg)" },
});

const fadeIn = keyframes({
  "0%": { opacity: 0, transform: "translateY(10px)" },
  "100%": { opacity: 1, transform: "translateY(0)" },
});

const pulse = keyframes({
  "0%, 100%": { transform: "scale(1)" },
  "50%": { transform: "scale(1.05)" },
});

export default function SubscriptionCheckoutPage() {
  const router = useRouter();
  const { uuid } = router.query;
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<"initial" | "processing" | "redirecting">(
    "initial"
  );

  useEffect(() => {
    if (!uuid || typeof uuid !== "string") {
      setError("Invalid checkout link");
      return;
    }

    const processCheckout = async () => {
      try {
        setLoadingStep("processing");

        // Small delay to show processing state
        await new Promise((resolve) => setTimeout(resolve, 1500));

        setLoadingStep("redirecting");

        // Redirect to our API endpoint which will handle the validation and redirect
        // The API will handle expired links by regenerating new checkout sessions
        window.location.href = `/api/subscription/checkout/${uuid}`;
      } catch (err) {
        console.error("Error processing checkout:", err);
        setError("Failed to process checkout. Please try again.");
      }
    };

    processCheckout();
  }, [uuid]);

  const getLoadingMessage = () => {
    switch (loadingStep) {
      case "initial":
        return "Preparing your checkout...";
      case "processing":
        return "Validating your subscription link...";
      case "redirecting":
        return "Redirecting to secure checkout...";
      default:
        return "Processing...";
    }
  };

  if (error) {
    return (
      <>
        <Head>
          <title>Checkout Error - Flapjack</title>
          <meta name="description" content="Error processing checkout link" />
        </Head>
        <Box
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
          }}
        >
          <Container size="lg">
            <Box
              style={{
                position: "relative",
                animation: `${fadeIn} 0.6s ease-out`,
              }}
            >
              {/* Main card with enhanced shadow */}
              <Paper
                shadow="0 20px 40px rgba(0, 0, 0, 0.1), 0 10px 20px rgba(0, 0, 0, 0.05)"
                radius="xl"
                p="xl"
                withBorder
                style={{
                  position: "relative",
                  background: "white",
                  maxWidth: 700,
                  margin: "0 auto",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <Stack align="center" spacing="lg">
                  <ThemeIcon
                    size={80}
                    radius="xl"
                    color="red"
                    variant="light"
                    style={{ animation: `${pulse} 2s ease-in-out infinite` }}
                  >
                    <IconX size={40} />
                  </ThemeIcon>

                  <Stack spacing="xs" align="center">
                    <Text size="xl" fw={700} ta="center">
                      Checkout Error
                    </Text>
                    <Text c="dimmed" ta="center" size="sm">
                      {error}
                    </Text>
                  </Stack>

                  <Group grow style={{ width: "100%" }}>
                    <Button
                      variant="filled"
                      color="orange"
                      onClick={() => router.push("/")}
                      fullWidth
                    >
                      Return to Home
                    </Button>
                    <Button variant="light" color="gray" onClick={() => router.reload()} fullWidth>
                      Try Again
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            </Box>
          </Container>
        </Box>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Processing Checkout - Flapjack</title>
        <meta name="description" content="Processing your subscription checkout..." />
      </Head>
      <Box
        style={{
          minHeight: "94vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        }}
      >
        <Container size="lg">
          <Box
            style={{
              position: "relative",
              animation: `${fadeIn} 0.6s ease-out`,
            }}
          >
            {/* Main card with enhanced shadow */}
            <Paper
              shadow="0 20px 40px rgba(0, 0, 0, 0.1), 0 10px 20px rgba(0, 0, 0, 0.05)"
              radius="xl"
              p="xl"
              withBorder
              style={{
                position: "relative",
                background: "white",
                maxWidth: 700,
                margin: "0 auto",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(10px)",
              }}
            >
              <Stack align="center" spacing="xl">
                {/* Logo/Brand */}
                <Stack align="center" spacing="md">
                  <img src={Logo.src} alt="Flapjack" width={35} height={35} />
                </Stack>

                {/* Loading Animation */}
                <Box style={{ position: "relative" }}>
                  <Center>
                    <Loader
                      size="xl"
                      color="orange"
                      variant="bars"
                      style={{
                        animation: `${pulse} 1.5s ease-in-out infinite`,
                      }}
                    />
                  </Center>
                </Box>

                {/* Loading Text */}
                <Stack align="center" spacing="xs">
                  <Text size="lg" fw={600} ta="center">
                    Processing Your Checkout
                  </Text>
                  <Text c="dimmed" ta="center" size="sm">
                    {getLoadingMessage()}
                  </Text>
                </Stack>

                {/* Progress Steps */}
                <Group spacing="xs">
                  <ThemeIcon
                    size="sm"
                    radius="xl"
                    color={loadingStep !== "initial" ? "orange" : "gray"}
                    variant={loadingStep !== "initial" ? "filled" : "light"}
                  >
                    <Text size="xs" fw={600}>
                      1
                    </Text>
                  </ThemeIcon>
                  <Box
                    style={{
                      width: 20,
                      height: 2,
                      background:
                        loadingStep === "processing" || loadingStep === "redirecting"
                          ? "#fd7e14"
                          : "#ced4da",
                      borderRadius: 1,
                      transition: "background 0.3s ease",
                    }}
                  />
                  <ThemeIcon
                    size="sm"
                    radius="xl"
                    color={
                      loadingStep === "processing" || loadingStep === "redirecting"
                        ? "orange"
                        : "gray"
                    }
                    variant={
                      loadingStep === "processing" || loadingStep === "redirecting"
                        ? "filled"
                        : "light"
                    }
                  >
                    <Text size="xs" fw={600}>
                      2
                    </Text>
                  </ThemeIcon>
                  <Box
                    style={{
                      width: 20,
                      height: 2,
                      background: loadingStep === "redirecting" ? "#fd7e14" : "#ced4da",
                      borderRadius: 1,
                      transition: "background 0.3s ease",
                    }}
                  />
                  <ThemeIcon
                    size="sm"
                    radius="xl"
                    color={loadingStep === "redirecting" ? "orange" : "gray"}
                    variant={loadingStep === "redirecting" ? "filled" : "light"}
                  >
                    <Text size="xs" fw={600}>
                      3
                    </Text>
                  </ThemeIcon>
                </Group>

                {/* Security Badge */}
                <Badge
                  leftSection={<IconLock size={14} />}
                  variant="light"
                  color="green"
                  size="md"
                  style={{
                    animation: `${fadeIn} 0.8s ease-out 0.5s both`,
                  }}
                >
                  Secure Checkout
                </Badge>
              </Stack>
            </Paper>
          </Box>
        </Container>
      </Box>
    </>
  );
}
