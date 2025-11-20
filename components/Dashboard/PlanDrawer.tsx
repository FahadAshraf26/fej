import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Drawer,
  Text,
  Badge,
  Stack,
  Radio,
  Group,
  createStyles,
  ActionIcon,
  ScrollArea,
  useMantineTheme,
  Loader,
} from "@mantine/core";
import { IconX } from "@tabler/icons";
import { IUserDetails } from "../../interfaces";
import { usePlanStore } from "../../stores/billing/Plan.store";
import { toast } from "react-toastify";

interface PlanDrawerProps {
  opened: boolean;
  onClose: () => void;
  selectedUser: IUserDetails | null;
  onUpdatePlan: (plan: string) => void;
  resturantsOptions?: any[];
}

const useStyles = createStyles((theme) => ({
  drawer: {
    "& .mantine-Drawer-drawer": {
      background: theme.white,
      borderLeft: `1px solid ${theme.colors.gray[2]}`,
      marginTop: 60,
      padding: 0,
      "&:hover": {
        overflow: "hidden",
      },
    },
    "& .mantine-Drawer-body": {
      overflow: "hidden !important",
    },
    "& .mantine-Drawer-content": {
      overflow: "hidden !important",
    },
    "& .mantine-Drawer-root": {
      "&:hover": {
        cursor: "initial",
      },
    },
    "& .mantine-Drawer-overlay": {
      "&:hover": {
        cursor: "initial",
      },
    },
  },
  header: {
    padding: theme.spacing.lg,
    borderBottom: `1px solid ${theme.colors.gray[2]}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: theme.white,
    position: "sticky",
    top: 0,
    zIndex: 2,
  },
  title: {
    marginBottom: theme.spacing.sm,
  },
  closeButton: {
    "&:hover": {
      backgroundColor: theme.colors.gray[0],
    },
  },
  drawerContent: {
    padding: theme.spacing.lg,
    backgroundColor: theme.white,
    minWidth: "100%",
    boxSizing: "border-box",
  },
  plan: {
    padding: theme.spacing.lg,
    borderRadius: theme.radius.md,
    border: `1px solid ${theme.colors.gray[2]}`,
    backgroundColor: theme.white,
    cursor: "pointer",
    transition: "border-color 200ms ease, box-shadow 200ms ease",
    position: "relative",
    minWidth: "100%",
    boxSizing: "border-box",
    flexShrink: 0,

    "&:hover": {
      borderColor: theme.colors.orange[3],
      boxShadow: theme.shadows.sm,
    },
  },
  selectedPlan: {
    borderColor: theme.colors.orange[5],
    backgroundColor: theme.fn.rgba(theme.colors.orange[0], 0.3),
  },
  radio: {
    display: "none",
  },
  planGroup: {
    width: "100%",
    boxSizing: "border-box",
  },
  planDetails: {
    flex: "1 0",
    minWidth: 0, // Prevents flex child from overflowing
  },
  priceText: {
    whiteSpace: "nowrap",
    flexShrink: 0,
    marginLeft: theme.spacing.md,
  },
  footer: {
    position: "sticky",
    bottom: 0,
    backgroundColor: theme.white,
    borderTop: `1px solid ${theme.colors.gray[2]}`,
    padding: theme.spacing.lg,
    zIndex: 2,
  },
}));

export const PlanDrawer = ({
  opened,
  onClose,
  selectedUser,
  onUpdatePlan,
  resturantsOptions = [],
}: PlanDrawerProps) => {
  const { classes, cx } = useStyles();
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const theme = useMantineTheme();
  const {
    plans,
    currentSubscription,
    isLoading,
    error,
    fetchPlans,
    fetchCurrentSubscription,
    clearSubscription,
    updateSubscription,
  } = usePlanStore();

  // Get restaurant name from options
  const getRestaurantName = () => {
    if (!selectedUser?.restaurant_id || !resturantsOptions) return "";
    const restaurant = resturantsOptions.find((r) => r.value === selectedUser.restaurant_id);
    return restaurant?.label || "";
  };

  // Reset state when drawer closes
  useEffect(() => {
    if (!opened) {
      setSelectedPlan("");
      clearSubscription();
      setIsUpdating(false);
    }
  }, [opened, clearSubscription]);

  // Fetch data when drawer opens for a new user
  useEffect(() => {
    if (opened && selectedUser?.id) {
      fetchPlans();
      fetchCurrentSubscription(selectedUser.id);
    }
  }, [opened, selectedUser?.id, fetchPlans, fetchCurrentSubscription]);

  // Update selected plan when subscription changes
  useEffect(() => {
    if (currentSubscription?.plans?.id) {
      setSelectedPlan(currentSubscription.plans.id);
    } else {
      setSelectedPlan("");
    }
  }, [currentSubscription]);

  const handlePlanUpdate = async () => {
    if (!selectedUser?.id || !selectedPlan) return;

    const selectedPlanData = plans.find((plan) => plan.id === selectedPlan);
    if (!selectedPlanData) return;

    try {
      setIsUpdating(true);
      // await updateSubscription(selectedUser.id, selectedPlan, selectedPlanData);
      toast.success("Plan updated successfully");
      handleClose();
    } catch (error: any) {
      console.error("Error updating plan:", error);
      toast.error(error.message || "Failed to update plan");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    if (isUpdating) return; // Prevent closing while updating
    onClose();
    setSelectedPlan("");
    clearSubscription();
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price / 100);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getSubscriptionStatus = () => {
    if (!currentSubscription) {
      return (
        <Badge color="red" variant="light" size="lg" radius="sm" mb="md">
          No Subscription
        </Badge>
      );
    }

    const getStatusColor = (status: string) => {
      switch (status) {
        case "active":
          return "green";
        case "trialing":
          return "blue";
        case "incomplete":
        case "incomplete_expired":
          return "yellow";
        case "canceled":
          return "red";
        default:
          return "gray";
      }
    };

    const getStatusLabel = (status: string) => {
      switch (status) {
        case "active":
          return "Active";
        case "trialing":
          return "On Trial";
        case "incomplete":
          return "Incomplete";
        case "incomplete_expired":
          return "Incomplete Expired";
        case "canceled":
          return "Canceled";
        default:
          return status.charAt(0).toUpperCase() + status.slice(1);
      }
    };

    return (
      <Box mb="xl">
        <Badge
          color={getStatusColor(currentSubscription.status)}
          variant="light"
          size="lg"
          radius="sm"
          mb="md"
        >
          {getStatusLabel(currentSubscription.status)}
        </Badge>
        {currentSubscription.status === "trialing"
          ? currentSubscription.trial_end_date && (
              <Text size="sm" color="dimmed">
                Trial ends on {formatDate(currentSubscription.trial_end_date)}
              </Text>
            )
          : currentSubscription.current_period_start &&
            currentSubscription.current_period_end && (
              <Text size="sm" color="dimmed">
                Billing period: {formatDate(currentSubscription.current_period_start)} -{" "}
                {formatDate(currentSubscription.current_period_end)}
              </Text>
            )}
      </Box>
    );
  };

  const renderNoSubscriptionContent = () => (
    <Box className={classes.drawerContent}>
      <Text size="xl" weight={700} mb="xl">
        No Active Subscription
      </Text>
      <Text color="dimmed" mb="xl">
        This customer doesn&apos;t have an active subscription. Please set up billing first.
      </Text>
      <Button
        color="orange"
        onClick={() => {
          // Format phone number to E.164 format if it exists
          const phoneNumber = selectedUser?.phone
            ? selectedUser.phone.startsWith("+")
              ? selectedUser.phone
              : `+${selectedUser.phone}`
            : "";

          // Create a data object with all the information
          const formData = {
            email: selectedUser?.email || "",
            phone: phoneNumber,
            restaurantName: getRestaurantName(),
            name: selectedUser?.customer_name || "",
          };

          // Encode the data as base64
          const encodedData = btoa(JSON.stringify(formData));

          // Create URL with only tab and encoded data
          const params = new URLSearchParams({
            tab: "subscriptions",
            data: encodedData,
          });

          window.location.href = `/billing?${params.toString()}`;
        }}
      >
        Set Up Billing
      </Button>
    </Box>
  );

  const renderSubscriptionContent = () => (
    <>
      {isUpdating && (
        <Box
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <Loader size="xl" color="orange" />
        </Box>
      )}
      <Box className={classes.drawerContent}>
        {!isLoading && getSubscriptionStatus()}
        <Text weight={600} size="lg" mb="md">
          Available Plans
        </Text>
        {isLoading ? (
          <Box ta="center" py="xl">
            <Loader size="md" />
          </Box>
        ) : error ? (
          <Text color="red" ta="center" py="xl">
            {error}
          </Text>
        ) : (
          <Stack spacing="md">
            {plans.map((plan) => (
              <Box
                key={plan.id}
                className={cx(classes.plan, {
                  [classes.selectedPlan]: selectedPlan === plan.id,
                })}
                onClick={() => setSelectedPlan(plan.id)}
              >
                <Radio
                  className={classes.radio}
                  checked={selectedPlan === plan.id}
                  value={plan.id}
                  onChange={() => {}}
                />
                <Group position="apart" className={classes.planGroup} noWrap>
                  <Box className={classes.planDetails}>
                    <Text weight={600}>{plan.name}</Text>
                    <Text size="sm" color="dimmed" mt={4}>
                      {plan.description}
                    </Text>
                    {plan.trialDays > 0 && (
                      <Badge color="blue" variant="light" mt={8}>
                        {plan.trialDays} days free trial
                      </Badge>
                    )}
                  </Box>
                  <Text weight={700} size="lg" color="orange" className={classes.priceText}>
                    {formatPrice(plan.price, plan.currency)}
                  </Text>
                </Group>
              </Box>
            ))}
          </Stack>
        )}
        {/* <Box mt={50} /> */}
      </Box>

      <Box className={classes.footer}>
        <Group spacing="md">
          <Button
            color="orange"
            onClick={handlePlanUpdate}
            size="md"
            disabled={
              !selectedPlan || selectedPlan === currentSubscription?.plans?.id || isUpdating
            }
            loading={isUpdating}
          >
            Update Plan
          </Button>
          <Button variant="subtle" onClick={handleClose} size="md" disabled={isUpdating}>
            Cancel
          </Button>
        </Group>
      </Box>
    </>
  );

  return (
    <Drawer
      opened={opened}
      onClose={handleClose}
      position="right"
      size="xl"
      className={classes.drawer}
      withCloseButton={false}
      overlayColor={theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.gray[2]}
      overlayOpacity={0.55}
      overlayBlur={3}
    >
      <Box className={classes.header}>
        <Box className={classes.title}>
          <Text size="xl" weight={700}>
            Manage Subscription
          </Text>
          <Text size="sm" color="dimmed" mt={5}>
            {selectedUser?.email}
          </Text>
        </Box>
        <ActionIcon
          onClick={handleClose}
          size="lg"
          className={classes.closeButton}
          disabled={isUpdating}
        >
          <IconX size={18} />
        </ActionIcon>
      </Box>

      {isLoading ? (
        <Box
          className={classes.drawerContent}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
          }}
        >
          <Loader size="xl" color="orange" />
        </Box>
      ) : !selectedUser?.stripe_customer_id || !currentSubscription?.is_active ? (
        renderNoSubscriptionContent()
      ) : (
        renderSubscriptionContent()
      )}
    </Drawer>
  );
};
