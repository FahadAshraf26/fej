import React, { useState, useEffect, useCallback } from "react";
import {
  Text,
  Table,
  Badge,
  Group,
  Paper,
  Stack,
  Loader,
  Box,
  Button,
  CopyButton,
  Tooltip,
} from "@mantine/core";
import { IconCopy, IconCheck, IconRefresh, IconLink } from "@tabler/icons";
import { toast } from "react-toastify";

interface CheckoutLink {
  id: string;
  user_id: string;
  restaurant_id: string;
  plan_id: string;
  stripe_customer_id: string;
  original_checkout_url: string;
  expires_at: string;
  status: string;
  created_at: string;
  updated_at: string;
  trial_days: number;
  trial_enabled: boolean;
  profiles: {
    email: string;
  };
  plans: {
    name: string;
    price: number;
    currency: string;
  };
}

interface CheckoutLinksTabProps {
  restaurantId: string;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatPrice = (price: number, currency: string = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price / 100);
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "green";
    case "expired":
      return "red";
    case "used":
      return "blue";
    default:
      return "gray";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "active":
      return "Active";
    case "expired":
      return "Expired";
    case "used":
      return "Used";
    default:
      return status;
  }
};

export const CheckoutLinksTab = ({ restaurantId }: CheckoutLinksTabProps) => {
  const [checkoutLinks, setCheckoutLinks] = useState<CheckoutLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCheckoutLinks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/billing/checkout-links?restaurantId=${restaurantId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch checkout links: ${response.status}`);
      }

      const data = await response.json();
      setCheckoutLinks(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load checkout links";
      console.error("Error loading checkout links:", error);
      setError(errorMessage);
      toast.error("Failed to load checkout links. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    loadCheckoutLinks();
  }, [loadCheckoutLinks]);

  const handleCopyLink = (linkId: string) => {
    const fullLink = `${process.env.NEXT_PUBLIC_BASE_URL}/subscription/${linkId}`;
    navigator.clipboard.writeText(fullLink);
    toast.success("Checkout link copied to clipboard!");
  };

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

  // Render error state
  if (error) {
    return (
      <Paper p="xl" radius="md" withBorder>
        <Stack spacing="md" align="center">
          <Text color="red" size="lg" weight={500}>
            Error Loading Checkout Links
          </Text>
          <Text color="dimmed" size="sm">
            {error}
          </Text>
          <Button onClick={loadCheckoutLinks} variant="outline">
            Try Again
          </Button>
        </Stack>
      </Paper>
    );
  }

  // Redesigned empty state section for Mantine v5
  if (checkoutLinks.length === 0) {
    return (
      <Box
        style={{
          minHeight: "500px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #f8f9ff 0%, #ffffff 100%)",
          borderRadius: "12px",
          border: "1px solid #e9ecef",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background decoration */}
        <Box
          style={{
            position: "absolute",
            top: "-50px",
            right: "-50px",
            width: "200px",
            height: "200px",
            background: "linear-gradient(135deg, #e7f5ff 0%, #d0ebff 100%)",
            borderRadius: "50%",
            opacity: 0.6,
          }}
        />
        <Box
          style={{
            position: "absolute",
            bottom: "-30px",
            left: "-30px",
            width: "150px",
            height: "150px",
            background: "linear-gradient(135deg, #fff5f5 0%, #ffe3e3 100%)",
            borderRadius: "50%",
            opacity: 0.4,
          }}
        />

        <Stack
          spacing="xl"
          align="center"
          style={{ maxWidth: "420px", zIndex: 1, padding: "2rem" }}
        >
          {/* Main illustration */}
          <Box
            style={{
              position: "relative",
              padding: "1.5rem",
            }}
          >
            <Box
              style={{
                width: "120px",
                height: "120px",
                background: "linear-gradient(135deg,rgb(250, 146, 60) 0%,rgb(242, 103, 29) 100%)",
                borderRadius: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 32px rgba(76, 110, 245, 0.25)",
                transform: "rotate(-5deg)",
              }}
            >
              <IconLink size={48} color="white" />
            </Box>

            {/* Floating elements */}
            <Box
              style={{
                position: "absolute",
                top: "10px",
                right: "-10px",
                width: "32px",
                height: "32px",
                background: "#51cf66",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(81, 207, 102, 0.3)",
              }}
            >
              <IconCheck size={16} color="white" />
            </Box>

            <Box
              style={{
                position: "absolute",
                bottom: "0px",
                left: "-15px",
                width: "28px",
                height: "28px",
                background: "#ff6b6b",
                borderRadius: "6px",
                transform: "rotate(15deg)",
                boxShadow: "0 4px 12px rgba(255, 107, 107, 0.3)",
              }}
            />
          </Box>

          {/* Content */}
          <Stack spacing="md" align="center">
            <Text
              size={28}
              fw={700}
              c="dark.8"
              ta="center"
              style={{
                background: "linear-gradient(135deg, #2d3748 0%, #4a5568 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                lineHeight: 1.2,
              }}
            >
              Ready to Generate
              <br />
              Checkout links?
            </Text>

            <Text size={16} c="gray.6" ta="center" style={{ lineHeight: 1.6, maxWidth: "360px" }}>
              New links can be generated from billing page.
            </Text>
          </Stack>

          {/* Actions */}
          <Group spacing="md" style={{ marginTop: "1rem" }}>
            <Button
              size="md"
              radius="xl"
              style={{
                background: "linear-gradient(135deg, #fd7e14 0%, #e8590c 100%)",
                border: "none",
                boxShadow: "0 4px 16px rgba(253, 126, 20, 0.3)",
                transition: "all 0.2s ease",
              }}
              leftIcon={<IconRefresh size={18} />}
              onClick={loadCheckoutLinks}
            >
              Check for Links
            </Button>
          </Group>

          <Text size="xs" c="gray.5" ta="center" style={{ marginTop: "1rem" }}>
            Links will appear automatically once generated for this restaurant
          </Text>
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing="xl">
      <Group position="apart">
        <Text size="xl" weight={700}>
          Checkout Links
        </Text>
        <Button variant="outline" onClick={loadCheckoutLinks}>
          Refresh
        </Button>
      </Group>

      <Paper radius="md" withBorder>
        <Table>
          <thead>
            <tr>
              <th>User Email</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Created</th>
              <th>Trial</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {checkoutLinks.map((link) => (
              <tr key={link.id}>
                <td>
                  <Text size="sm" weight={500}>
                    {link.profiles.email}
                  </Text>
                </td>
                <td>
                  <Stack spacing={2}>
                    <Text size="sm" weight={500}>
                      {link.plans.name}
                    </Text>
                    <Text size="sm" color="dimmed">
                      {formatPrice(link.plans.price, link.plans.currency)}
                    </Text>
                  </Stack>
                </td>
                <td>
                  <Badge color={getStatusColor(link.status)} variant="filled">
                    {getStatusLabel(link.status)}
                  </Badge>
                </td>
                <td>
                  <Text size="sm" color="dimmed">
                    {formatDate(link.created_at)}
                  </Text>
                </td>
                <td>
                  {link.trial_enabled ? (
                    <Badge color="blue" variant="light">
                      {link.trial_days} days
                    </Badge>
                  ) : (
                    <Text size="sm" color="dimmed">
                      No trial
                    </Text>
                  )}
                </td>
                <td>
                  {link.status !== "used" && (
                    <CopyButton
                      value={`${process.env.NEXT_PUBLIC_BASE_URL}/subscription/${link.id}`}
                    >
                      {({ copied, copy }) => (
                        <Tooltip label={copied ? "Copied!" : "Copy link"}>
                          <Button
                            size="xs"
                            variant="outline"
                            leftIcon={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                            onClick={copy}
                          >
                            {copied ? "Copied!" : "Copy"}
                          </Button>
                        </Tooltip>
                      )}
                    </CopyButton>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Paper>
    </Stack>
  );
};
