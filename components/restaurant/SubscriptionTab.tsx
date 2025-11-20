import React, { useState, useRef, useEffect } from "react";
import {
  Text,
  Button,
  Group,
  Stack,
  Paper,
  Badge,
  useMantineTheme,
  ActionIcon,
  SimpleGrid,
  Box,
  createStyles,
  Tooltip,
} from "@mantine/core";
import {
  IconPlus,
  IconEdit,
  IconClock,
  IconStar,
  IconCreditCard,
  IconPackage,
  IconArrowRight,
} from "@tabler/icons";
import { useUser } from "../../hooks/useUser";
import { useRouter } from "next/router";
import { CreateSubscriptionModal } from "./CreateSubscriptionModal";
import { toast } from "react-toastify";

interface SubscriptionTabProps {
  restaurantId: string;
}

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  features: any;
}

interface Subscription {
  id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_end_date: string | null;
  trial_activated: boolean;
  is_active: boolean;
  canceled_at: string | null;
  plans: Plan;
  profiles: User;
}

interface UserSubscriptions {
  user: User;
  subscriptions: Subscription[];
}

// Helper functions
const formatPrice = (price: number, currency: string = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price / 100);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Create styles for subscription cards
const useStyles = createStyles((theme) => ({
  card: {
    position: "relative",
    overflow: "hidden",
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    boxShadow: theme.shadows.sm,
    height: "100%", // Ensure consistent height
    display: "flex",
    flexDirection: "column",
  },
  section: {
    backgroundColor: "white",
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  lastSection: {
    marginBottom: 0,
  },
  editButton: {
    borderRadius: theme.radius.xl,
  },
  planName: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  priceLabel: {
    fontWeight: 500,
    textTransform: "uppercase",
    fontSize: theme.fontSizes.xs,
  },
  price: {
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1,
  },
  // Active styles (teal)
  activeCard: {
    background: "linear-gradient(135deg, #e6f7f5 0%, #eaf7ff 100%)",
  },
  activeEditButton: {
    backgroundColor: "white",
    color: theme.colors.teal[6],
    "&:hover": {
      backgroundColor: theme.colors.gray[0],
    },
  },
  activePriceLabel: {
    color: theme.colors.teal[6],
  },
  activePrice: {
    color: theme.colors.teal[7],
  },
  // Past due styles (yellow)
  pastDueCard: {
    background: "linear-gradient(135deg, #fffbe6 0%, #fff9db 100%)",
  },
  pastDueEditButton: {
    backgroundColor: "white",
    color: theme.colors.yellow[7],
    "&:hover": {
      backgroundColor: theme.colors.gray[0],
    },
  },
  pastDuePriceLabel: {
    color: theme.colors.yellow[7],
  },
  pastDuePrice: {
    color: theme.colors.yellow[8],
  },
  // Failed payment styles (red)
  failedCard: {
    background: "linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)",
  },
  failedEditButton: {
    backgroundColor: "white",
    color: theme.colors.red[6],
    "&:hover": {
      backgroundColor: theme.colors.gray[0],
    },
  },
  failedPriceLabel: {
    color: theme.colors.red[6],
  },
  failedPrice: {
    color: theme.colors.red[7],
  },
  alertBox: {
    borderColor: theme.colors.red[1],
    borderWidth: 1,
    borderStyle: "solid",
  },
}));

// Helper types
interface SubscriptionCardProps {
  subscription: any;
  onEdit: () => void;
  isFlapjack: boolean;
}

// Add ClampedTextWithTooltip component with proper types and measurement
const ClampedTextWithTooltip: React.FC<{ children: React.ReactNode }> = ({
  children,
  ...props
}) => {
  const textRef = useRef<HTMLDivElement>(null);
  const [clamped, setClamped] = useState(false);

  useEffect(() => {
    const el = textRef.current;
    if (el) {
      setClamped(el.scrollHeight > el.clientHeight + 1);
    }
  }, [children]);

  return (
    <Tooltip
      label={<span style={{ whiteSpace: "pre-line", wordBreak: "break-word" }}>{children}</span>}
      disabled={!clamped}
      withArrow
      withinPortal
      sx={{ maxWidth: 320, textAlign: "left" }}
    >
      <Text
        component="div"
        ref={textRef}
        size="xs"
        color="dimmed"
        sx={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          textOverflow: "ellipsis",
          minHeight: 32,
          maxHeight: 32,
        }}
        {...props}
      >
        {children}
      </Text>
    </Tooltip>
  );
};

// Card Components
const TrialSubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  onEdit,
  isFlapjack,
}) => {
  const { classes, cx } = useStyles();
  const theme = useMantineTheme();
  let daysLeft: number | null = null;
  if (
    subscription.status === "trialing" &&
    subscription.trial_activated &&
    subscription.trial_end_date
  ) {
    const trialEndDate = new Date(subscription.trial_end_date);
    const now = new Date();
    daysLeft = Math.max(
      0,
      Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );
  }

  return (
    <Paper className={cx(classes.card, classes.activeCard)} p="lg">
      <Group position="apart" mb="md">
        <Box className={classes.section} py="xs" px="md">
          <Group spacing="xs">
            <IconStar size={16} color={theme.colors.blue[5]} />
            <Text className={classes.planName} weight={600} size="lg" color={theme.colors.blue[7]}>
              {subscription.plans.name}
            </Text>
          </Group>
        </Box>
        {isFlapjack && (
          <ActionIcon size="lg" className={classes.activeEditButton} radius="xl" onClick={onEdit}>
            <IconEdit size={18} />
          </ActionIcon>
        )}
      </Group>
      <Box className={classes.section} mb="md">
        <ClampedTextWithTooltip>{subscription.plans.description}</ClampedTextWithTooltip>
      </Box>
      <Box className={classes.section} mb="md">
        <Box
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            minHeight: 32,
          }}
        >
          <Text
            className={cx(classes.priceLabel, classes.activePriceLabel)}
            size="xs"
            color={theme.colors.gray[6]}
            style={{ fontWeight: 600 }}
          >
            TRIAL PERIOD
          </Text>
          <Box
            sx={{
              background: theme.colors.blue[0],
              color: theme.colors.blue[7],
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              padding: "2px 16px",
              minHeight: 28,
              display: "flex",
              alignItems: "center",
              letterSpacing: 0.2,
            }}
          >
            {daysLeft !== null ? (daysLeft > 0 ? `${daysLeft} DAYS LEFT` : "Trial ended") : null}
          </Box>
        </Box>
        <Text
          className={cx(classes.price, classes.activePrice)}
          style={{ color: theme.colors.blue[7], fontWeight: 700, marginTop: 2 }}
        >
          {formatPrice(subscription.plans.price, subscription.plans.currency)}
        </Text>
      </Box>
      <Box className={cx(classes.section, classes.lastSection)}>
        <Group spacing={6} align="center">
          <IconClock size={16} color={theme.colors.blue[6]} />
          <Text size="sm" color="dimmed" weight={500}>
            Trial ends on
          </Text>
        </Group>
        <Text size="sm" mt={1} color="dimmed">
          {formatDate(subscription.trial_end_date)}
        </Text>
      </Box>
    </Paper>
  );
};

const InactiveSubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  onEdit,
  isFlapjack,
}) => {
  const { classes, cx } = useStyles();
  const theme = useMantineTheme();
  return (
    <Paper className={cx(classes.card)} p="lg" style={{ backgroundColor: theme.colors.gray[0] }}>
      <Group position="apart" mb="md">
        <Box className={classes.section} py="xs" px="md">
          <Group spacing="xs">
            <IconStar size={16} color={theme.colors.gray[6]} />
            <Text className={classes.planName} weight={600} size="lg" color={theme.colors.gray[7]}>
              {subscription.plans.name}
            </Text>
          </Group>
        </Box>
        {isFlapjack && (
          <ActionIcon size="lg" className={classes.editButton} radius="xl" onClick={onEdit}>
            <IconEdit size={18} />
          </ActionIcon>
        )}
      </Group>
      <Box className={classes.section} mb="md">
        <ClampedTextWithTooltip>{subscription.plans.description}</ClampedTextWithTooltip>
      </Box>
      <Box className={classes.section} mb="md">
        <Box
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            minHeight: 32,
          }}
        >
          <Text
            className={classes.priceLabel}
            size="xs"
            color={theme.colors.gray[6]}
            style={{ fontWeight: 600 }}
          >
            MONTHLY PAYMENT
          </Text>
          <Box
            sx={{
              background: theme.colors.gray[1],
              color: theme.colors.gray[7],
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              padding: "2px 16px",
              minHeight: 28,
              display: "flex",
              alignItems: "center",
              letterSpacing: 0.2,
            }}
          >
            INACTIVE
          </Box>
        </Box>
        <Text
          className={classes.price}
          style={{ color: theme.colors.gray[7], fontWeight: 700, marginTop: 2 }}
        >
          {formatPrice(subscription.plans.price, subscription.plans.currency)}
        </Text>
      </Box>
      <Box className={cx(classes.section, classes.lastSection)}>
        <Group spacing={6} align="center">
          <IconClock size={16} color={theme.colors.gray[6]} />
          <Text size="sm" color="dimmed" weight={500}>
            Last active period
          </Text>
        </Group>
        <Text size="sm" mt={1} color="dimmed">
          {formatDate(subscription.current_period_start)} –{" "}
          {formatDate(subscription.current_period_end)}
        </Text>
      </Box>
    </Paper>
  );
};

// Empty state component
const EmptySubscriptionState: React.FC<{ onAddSubscription: () => void; userRole?: string }> = ({
  onAddSubscription,
  userRole,
}) => {
  const theme = useMantineTheme();
  const router = useRouter();

  return (
    <Paper
      p="xl"
      radius="lg"
      withBorder
      sx={{
        background: theme.white,
        borderColor: theme.fn.rgba(theme.colors.blue[3], 0.15),
        boxShadow: theme.shadows.sm,
      }}
    >
      <Stack align="center" spacing="xl">
        <Box
          sx={{
            position: "relative",
            width: 120,
            height: 120,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Background circle with gradient */}
          <Box
            sx={{
              position: "absolute",
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: theme.fn.gradient({
                from: theme.colors.blue[1],
                to: theme.colors.blue[0],
                deg: 45,
              }),
              opacity: 0.8,
            }}
          />
          {/* Foreground circle with icon */}
          <Box
            sx={{
              position: "relative",
              width: "80%",
              height: "80%",
              borderRadius: "50%",
              background: theme.fn.gradient({
                from: theme.colors.blue[6],
                to: theme.colors.blue[5],
                deg: 45,
              }),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: theme.shadows.md,
              transform: "translateY(-2px)",
            }}
          >
            <IconPackage size={48} color="white" stroke={1.5} />
          </Box>
        </Box>

        <Stack spacing="xs" align="center" sx={{ maxWidth: 500 }}>
          <Text
            size="xl"
            weight={700}
            align="center"
            color={theme.colors.blue[7]}
            sx={{ letterSpacing: "-0.5px" }}
          >
            No Active Subscriptions
          </Text>
          <Text
            size="sm"
            color="dimmed"
            align="center"
            sx={{
              lineHeight: 1.6,
              maxWidth: 400,
            }}
          >
            {userRole === "flapjack"
              ? "Set up your billing information to start managing subscriptions for your restaurant."
              : "There are no active subscriptions for this restaurant at the moment."}
          </Text>
        </Stack>

        {userRole === "flapjack" && (
          <Button
            rightIcon={<IconArrowRight size={16} />}
            color="blue"
            size="md"
            onClick={() => router.push("/billing")}
            variant="filled"
            sx={{
              background: theme.fn.gradient({
                from: theme.colors.blue[6],
                to: theme.colors.blue[7],
                deg: 45,
              }),
              "&:hover": {
                background: theme.fn.gradient({
                  from: theme.colors.blue[7],
                  to: theme.colors.blue[8],
                  deg: 45,
                }),
                transform: "translateY(-1px)",
              },
              transition: "all 0.2s ease",
              boxShadow: theme.shadows.sm,
              paddingLeft: 32,
              paddingRight: 32,
            }}
          >
            Set Up Billing
          </Button>
        )}
      </Stack>
    </Paper>
  );
};

// Add this new card component:
const CanceledSubscriptionCard: React.FC<SubscriptionCardProps & { onReactivate: () => void }> = ({
  subscription,
  onEdit,
  isFlapjack,
  onReactivate,
}) => {
  const { classes, cx } = useStyles();
  const theme = useMantineTheme();
  // Reason for cancellation, fallback to default if not present
  const cancelReason = subscription.canceled_reason || "No reason provided.";
  return (
    <Paper className={cx(classes.card)} p="lg" style={{ background: theme.colors.gray[1] }}>
      <Group position="apart" mb="md">
        <Box className={classes.section} py="xs" px="md">
          <Group spacing="xs">
            <IconStar size={16} color={theme.colors.gray[6]} />
            <Text className={classes.planName} weight={600} size="lg" color={theme.colors.gray[7]}>
              {subscription.plans.name}
            </Text>
          </Group>
        </Box>
      </Group>
      <Box
        className={classes.section}
        mb="md"
        sx={{
          background: theme.colors.gray[0],
          borderRadius: 8,
          padding: "8px 12px",
          marginBottom: 8,
        }}
      >
        <ClampedTextWithTooltip>{subscription.plans.description}</ClampedTextWithTooltip>
      </Box>
      <Box className={classes.section} mb="md">
        <Box
          sx={{
            background: theme.colors.gray[2],
            color: theme.colors.gray[7],
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            padding: "2px 16px",
            minHeight: 28,
            display: "flex",
            alignItems: "center",
            letterSpacing: 0.2,
          }}
        >
          CANCELED
        </Box>
        <Text
          className={classes.price}
          style={{ color: theme.colors.gray[7], fontWeight: 700, marginTop: 8 }}
        >
          {formatPrice(subscription.plans.price, subscription.plans.currency)}
        </Text>
        <Group spacing={6} align="center" mt={4}>
          <IconClock size={16} color={theme.colors.gray[6]} />
          <Text size="sm" color="dimmed" weight={500}>
            Last active period
          </Text>
        </Group>
        <Text size="sm" mt={1} color="dimmed">
          {formatDate(subscription.current_period_start)} –{" "}
          {formatDate(subscription.current_period_end)}
        </Text>
        <Box mt={8}>
          <Text size="sm" color="dimmed" weight={500}>
            Reason for cancellation
          </Text>
          <Text size="sm" color="red" mt={2}>
            {cancelReason}
          </Text>
        </Box>
      </Box>
    </Paper>
  );
};

export const SubscriptionTab = ({ restaurantId }: SubscriptionTabProps) => {
  const userDetails = useUser();
  const [isLoading, setIsLoading] = React.useState(true);
  const [subscriptions, setSubscriptions] = React.useState<Subscription[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [selectedSubscription, setSelectedSubscription] = React.useState<Subscription | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [defaultPlan, setDefaultPlan] = useState<Plan | null>(null);

  const loadSubscriptions = async () => {
    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/owner`);
      if (!response.ok) {
        throw new Error("Failed to fetch subscriptions");
      }
      const data = await response.json();
      setSubscriptions(data.subscriptions || []);
    } catch (error) {
      console.error("Error loading subscriptions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadSubscriptions();
  }, [restaurantId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "green";
      case "trialing":
        return "blue";
      case "incomplete":
        return "yellow";
      case "canceled":
        return "red";
      default:
        return "gray";
    }
  };

  const handleAddSubscription = (plan?: Plan) => {
    setDefaultPlan(plan || null);
    setIsCreateModalOpen(true);
  };

  const handleEditSubscription = (subscription: any) => {
    console.log("subscription", subscription);
    setSelectedSubscription(subscription);
    setIsEditModalOpen(true);
  };

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  // Group subscriptions by user
  const subscriptionsByUser = subscriptions.reduce<Record<string, UserSubscriptions>>(
    (acc, subscription) => {
      const userId = subscription.profiles.id;
      if (!acc[userId]) {
        acc[userId] = {
          user: subscription.profiles,
          subscriptions: [],
        };
      }
      acc[userId].subscriptions.push(subscription);
      return acc;
    },
    {}
  );

  // Helper to pick the right card
  const renderSubscriptionCard = (subscription: any) => {
    const status = subscription.status;
    const isFlapjack = userDetails?.role === "flapjack";

    // Handle trial status
    if (
      subscription.status === "trialing" &&
      subscription.trial_activated &&
      subscription.trial_end_date
    ) {
      return (
        <TrialSubscriptionCard
          subscription={subscription}
          onEdit={() => handleEditSubscription(subscription)}
          isFlapjack={isFlapjack}
        />
      );
    }

    // Handle other statuses
    switch (status) {
      case "active":
        return (
          <ActiveSubscriptionCard
            subscription={subscription}
            onEdit={() => handleEditSubscription(subscription)}
            isFlapjack={isFlapjack}
          />
        );
      case "trialing":
        return (
          <TrialSubscriptionCard
            subscription={subscription}
            onEdit={() => handleEditSubscription(subscription)}
            isFlapjack={isFlapjack}
          />
        );
      case "past_due":
        return (
          <PastDueSubscriptionCard
            subscription={subscription}
            onEdit={() => handleEditSubscription(subscription)}
            isFlapjack={isFlapjack}
          />
        );
      case "canceled":
        return (
          <CanceledSubscriptionCard
            subscription={subscription}
            onEdit={() => handleEditSubscription(subscription)}
            isFlapjack={isFlapjack}
            onReactivate={() => handleAddSubscription(subscription.plans)}
          />
        );
      case "incomplete":
      case "unpaid":
        return (
          <FailedPaymentCard
            subscription={subscription}
            onEdit={() => handleEditSubscription(subscription)}
            isFlapjack={isFlapjack}
          />
        );
      default:
        return (
          <InactiveSubscriptionCard
            subscription={subscription}
            onEdit={() => handleEditSubscription(subscription)}
            isFlapjack={isFlapjack}
          />
        );
    }
  };

  return (
    <Stack spacing="xl">
      {userDetails?.role === "flapjack" && (
        <Group position="right">
          <Button
            leftIcon={<IconPlus size={16} />}
            color="orange"
            onClick={() => handleAddSubscription()}
          >
            Add Subscription
          </Button>
        </Group>
      )}

      {Object.keys(subscriptionsByUser).length === 0 ? (
        <EmptySubscriptionState
          onAddSubscription={() => handleAddSubscription()}
          userRole={userDetails?.role}
        />
      ) : (
        Object.values(subscriptionsByUser).map(({ user, subscriptions: userSubscriptions }) => (
          <Paper key={user.id} p="md" radius="md" withBorder>
            <Stack spacing="md">
              <Group position="apart">
                <Stack spacing={4}>
                  <Text weight={500} size="lg">
                    {user.first_name} {user.last_name}
                  </Text>
                  <Text size="sm" color="dimmed">
                    {user.email}
                  </Text>
                </Stack>
                <Badge size="lg" color="blue" variant="light">
                  {user.role}
                </Badge>
              </Group>

              <SimpleGrid cols={2} spacing="md">
                {userSubscriptions.map((subscription: any) => (
                  <Box key={subscription.id}>{renderSubscriptionCard(subscription)}</Box>
                ))}
              </SimpleGrid>

              {userSubscriptions.length === 0 && (
                <Button color="orange" fullWidth onClick={() => handleAddSubscription()}>
                  Add Subscription
                </Button>
              )}
            </Stack>
          </Paper>
        ))
      )}

      <CreateSubscriptionModal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedSubscription(null);
          setDefaultPlan(null);
        }}
        restaurantId={restaurantId}
        onSuccess={loadSubscriptions}
        subscription={selectedSubscription as any}
        defaultPlan={defaultPlan}
      />
    </Stack>
  );
};

// Active subscription card
const ActiveSubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  onEdit,
  isFlapjack,
}) => {
  const { classes, cx } = useStyles();
  const theme = useMantineTheme();
  return (
    <Paper className={cx(classes.card, classes.activeCard)} p="lg">
      <Group position="apart" mb="md">
        <Box className={classes.section} py="xs" px="md">
          <Group spacing="xs">
            <IconStar size={16} color={theme.colors.teal[5]} />
            <Text className={classes.planName} weight={600} size="lg" color={theme.colors.teal[7]}>
              {subscription.plans.name}
            </Text>
          </Group>
        </Box>
        {isFlapjack && (
          <ActionIcon size="lg" className={classes.activeEditButton} radius="xl" onClick={onEdit}>
            <IconEdit size={18} />
          </ActionIcon>
        )}
      </Group>
      <Box className={classes.section} mb="md">
        <ClampedTextWithTooltip>{subscription.plans.description}</ClampedTextWithTooltip>
      </Box>
      <Box className={classes.section} mb="md">
        <Box
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            minHeight: 32,
          }}
        >
          <Text
            className={cx(classes.priceLabel, classes.activePriceLabel)}
            size="xs"
            color={theme.colors.gray[6]}
            style={{ fontWeight: 600 }}
          >
            MONTHLY PAYMENT
          </Text>
          <Box
            sx={{
              background: theme.colors.teal[0],
              color: theme.colors.teal[7],
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              padding: "2px 16px",
              minHeight: 28,
              display: "flex",
              alignItems: "center",
              letterSpacing: 0.2,
            }}
          >
            ACTIVE NOW
          </Box>
        </Box>
        <Text
          className={cx(classes.price, classes.activePrice)}
          style={{ color: theme.colors.teal[7], fontWeight: 700, marginTop: 2 }}
        >
          {formatPrice(subscription.plans.price, subscription.plans.currency)}
        </Text>
      </Box>
      <Box className={cx(classes.section, classes.lastSection)}>
        <Group spacing={6} align="center">
          <IconClock size={16} color={theme.colors.teal[6]} />
          <Text size="sm" color="dimmed" weight={500}>
            Current billing period
          </Text>
        </Group>
        <Text size="sm" mt={1} color="dimmed">
          {formatDate(subscription.current_period_start)} –{" "}
          {formatDate(subscription.current_period_end)}
        </Text>
      </Box>
    </Paper>
  );
};

// Past due subscription card
const PastDueSubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  onEdit,
  isFlapjack,
}) => {
  const { classes, cx } = useStyles();
  const theme = useMantineTheme();
  return (
    <Paper className={cx(classes.card, classes.pastDueCard)} p="lg">
      <Group position="apart" mb="md">
        <Box className={classes.section} py="xs" px="md">
          <Group spacing="xs">
            <IconStar size={16} color={theme.colors.yellow[7]} />
            <Text
              className={classes.planName}
              weight={600}
              size="lg"
              color={theme.colors.yellow[8]}
            >
              {subscription.plans.name}
            </Text>
          </Group>
        </Box>
        {isFlapjack && (
          <ActionIcon size="lg" className={classes.pastDueEditButton} radius="xl" onClick={onEdit}>
            <IconEdit size={18} />
          </ActionIcon>
        )}
      </Group>
      <Box className={classes.section} mb="md">
        <ClampedTextWithTooltip>{subscription.plans.description}</ClampedTextWithTooltip>
      </Box>
      <Box className={classes.section} mb="md">
        <Box
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            minHeight: 32,
          }}
        >
          <Text
            className={cx(classes.priceLabel, classes.pastDuePriceLabel)}
            size="xs"
            color={theme.colors.gray[6]}
            style={{ fontWeight: 600 }}
          >
            MONTHLY PAYMENT
          </Text>
          <Box
            sx={{
              background: theme.colors.yellow[0],
              color: theme.colors.yellow[8],
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              padding: "2px 16px",
              minHeight: 28,
              display: "flex",
              alignItems: "center",
              letterSpacing: 0.2,
            }}
          >
            PAST DUE
          </Box>
        </Box>
        <Text
          className={cx(classes.price, classes.pastDuePrice)}
          style={{
            color: theme.colors.yellow[8],
            fontWeight: 700,
            marginTop: 2,
          }}
        >
          {formatPrice(subscription.plans.price, subscription.plans.currency)}
        </Text>
      </Box>
      <Box className={cx(classes.section, classes.lastSection)}>
        <Group spacing={6} align="center">
          <IconClock size={16} color={theme.colors.yellow[2]} />
          <Text size="sm" color="dimmed" weight={500}>
            Last paid period
          </Text>
        </Group>
        <Text size="sm" mt={2} color="dimmed">
          {formatDate(subscription.current_period_start)} –{" "}
          {formatDate(subscription.current_period_end)}
        </Text>
      </Box>
    </Paper>
  );
};

// Failed payment card
const FailedPaymentCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  onEdit,
  isFlapjack,
}) => {
  const { classes, cx } = useStyles();
  const theme = useMantineTheme();
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const router = useRouter();

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

  return (
    <Paper className={cx(classes.card, classes.failedCard)} p="lg">
      <Stack spacing="md">
        <Group position="apart" align="flex-start">
          <Box className={classes.planName}>
            <IconCreditCard size={20} color={theme.colors.red[6]} />
            <Text weight={500} size="lg">
              {subscription.plans.name}
            </Text>
          </Box>
          {isFlapjack && (
            <ActionIcon
              className={classes.editButton}
              variant="filled"
              color="red"
              onClick={onEdit}
              size="lg"
            >
              <IconEdit size={16} />
            </ActionIcon>
          )}
        </Group>

        <Box className={classes.section}>
          <Stack spacing="xs">
            <Text size="sm" color="dimmed">
              Payment Status
            </Text>
            <Badge color="red" variant="light" size="lg">
              Payment Failed
            </Badge>
            <Text size="sm" color="red">
              Your last payment attempt failed. Please update your payment method to continue using
              the service.
            </Text>
          </Stack>
        </Box>

        <Box className={classes.section}>
          <Stack spacing="xs">
            <Text size="sm" color="dimmed">
              Next Payment Attempt
            </Text>
            <Text weight={500}>{formatDate(subscription.current_period_end)}</Text>
          </Stack>
        </Box>

        <Box className={classes.section}>
          <Stack spacing="xs">
            <Text size="sm" color="dimmed">
              Price
            </Text>
            <Group spacing="xs" align="baseline">
              <Text className={classes.price} color={theme.colors.red[7]}>
                {formatPrice(subscription.plans.price, subscription.plans.currency)}
              </Text>
              <Text size="sm" color="dimmed">
                /month
              </Text>
            </Group>
          </Stack>
        </Box>

        <Button
          fullWidth
          color="red"
          onClick={() => handleUpdatePayment(subscription.id)}
          loading={isUpdatingPayment}
          leftIcon={<IconCreditCard size={16} />}
        >
          Update Payment Method
        </Button>
      </Stack>
    </Paper>
  );
};
