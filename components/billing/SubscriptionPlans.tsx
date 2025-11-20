import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Paper,
  Title,
  Group,
  Text,
  Stack,
  Card,
  Switch,
  Button,
  Grid,
  Loader,
  ThemeIcon,
  Box,
  Tooltip,
  ActionIcon,
  CopyButton,
  Transition,
  useMantineTheme,
  Center,
  LoadingOverlay,
  TextInput,
  Checkbox,
  Notification,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconCrown,
  IconReceipt,
  IconStar,
  IconClipboard,
  IconCheck,
  IconExternalLink,
  IconX,
  IconAlertTriangle,
} from "@tabler/icons";
import { useUserContext } from "@Context/UserContext";
import AccessDenied from "@Components/CommonComponents/AccessDenied";
import { IPlan } from "interfaces/IPlan";
import { useRouter } from "next/router";
import { TRIAL_DAYS } from "@Config/app-settings";
import { useForm } from "@mantine/form";
import PhoneInput, {
  isValidPhoneNumber,
  formatPhoneNumberIntl,
  parsePhoneNumber,
} from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { Slide, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import debounce from "lodash/debounce";
import { getBaseUrl } from "../../utils/getBaseUrl";

interface SubscriptionPlansProps {
  initialData?: {
    email?: string;
    phone?: string;
    restaurantName?: string;
    name?: string;
  };
}

export default function SubscriptionPlans({ initialData }: SubscriptionPlansProps) {
  const { isAuthenticated, user, isLoading } = useUserContext();
  const theme = useMantineTheme();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const router = useRouter();
  const [plans, setPlans] = useState<IPlan[]>([]);
  const [isPlansLoading, setIsPlansLoading] = useState(true);
  const [trialEnabled, setTrialEnabled] = useState(true);
  const [checkingInfo, setCheckingInfo] = useState(false);
  const [sendInvoices, setSendInvoices] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [isGeneratingUrl, setIsGeneratingUrl] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [email, setEmail] = useState(initialData?.email || "");
  const [phone, setPhone] = useState(
    initialData?.phone
      ? initialData.phone.startsWith("+")
        ? initialData.phone
        : `+${initialData.phone}`
      : ""
  );
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [userCheckError, setUserCheckError] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      customerName: initialData?.name || "",
      restaurantName: initialData?.restaurantName || "",
      email: initialData?.email || "",
      phoneNumber: initialData?.phone || "",
    },
    validate: {
      customerName: (value) => (value.length < 2 ? "Customer name is required" : null),
      restaurantName: (value) => (value.length < 2 ? "Restaurant name is required" : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
    },
  });

  // Initialize form fields when initialData changes
  useEffect(() => {
    if (initialData) {
      setEmail(initialData.email || "");
      setPhone(
        initialData.phone
          ? initialData.phone.startsWith("+")
            ? initialData.phone
            : `+${initialData.phone}`
          : ""
      );
      form.setFieldValue("customerName", initialData.name || "");
      form.setFieldValue("restaurantName", initialData.restaurantName || "");
    }
  }, [initialData]);

  // Add effect to clear URL when form values change
  useEffect(() => {
    setGeneratedUrl(null);
  }, [
    form.values.customerName,
    form.values.restaurantName,
    form.values.email,
    form.values.phoneNumber,
  ]);

  // Add effect to clear URL when trial or send invoices changes
  useEffect(() => {
    setGeneratedUrl(null);
  }, [trialEnabled, sendInvoices]);

  const fetchPlans = async () => {
    try {
      setIsPlansLoading(true);
      await fetch(`/api/billing/plans/tiered`)
        .then((res) => res.json())
        .then((data) => {
          setPlans(data);
        });
    } finally {
      setIsPlansLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user?.role === "flapjack") {
        fetchPlans();
      }
    }
  }, [isAuthenticated, user, isLoading]);

  // Clear generated URL when changing plans
  const handlePlanSelection = (planId: string) => {
    setSelectedPlan(planId);
    setGeneratedUrl(null); // Clear the generated URL when changing plans
  };

  const generateCheckoutUrl = async () => {
    if (!selectedPlan) return;

    const trimmedEmail = form.values.email.trim();
    const trimmedPhone = form.values.phoneNumber ? form.values.phoneNumber.trim() : undefined;

    // Validate phone number if provided
    if (trimmedPhone && !isValidPhoneNumber(trimmedPhone)) {
      setPhoneError("Invalid phone number");
      return;
    }
    setPhoneError(null);
    setGeneratedUrl(null);
    setIsGeneratingUrl(true);
    try {
      // Find the selected plan object from the plans array
      const selectedPlanData = plans.find((plan) => plan.id === selectedPlan);

      if (!selectedPlanData) {
        throw new Error("Selected plan not found");
      }
      // Create the request payload
      const payload = {
        email: trimmedEmail,
        name: form.values.customerName,
        restaurantName: form.values.restaurantName,
        phoneNumber: trimmedPhone,
        sendInvoices: sendInvoices,
        // Include logged-in user info for sales rep mapping
        loggedInUser: {
          email: user?.email,
          phone: user?.phone,
        },
        plan: {
          id: selectedPlanData.id,
          name: selectedPlanData.name,
          description: selectedPlanData.description,
          price: selectedPlanData.price,
          currency: selectedPlanData.currency,
          stripePriceId: selectedPlanData.stripePriceId,
          trialDays: trialEnabled ? TRIAL_DAYS : 0,
          features: selectedPlanData.features || { tier: "basic" },
        },
        baseUrl: getBaseUrl(),
      };

      // Make the POST request to /api/billing
      const response = await fetch("/api/billing", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.name === "SubscriptionError" || data.code === "SUBSCRIPTION_ERROR") {
          const toastId = toast.warning(
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "8px 0",
              }}
            >
              {/* Header with icon and title */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 16,
                  width: "100%",
                  paddingBottom: 12,
                  borderBottom: "1px solid rgba(255, 152, 0, 0.2)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    backgroundColor: "rgba(255, 152, 0, 0.1)",
                    marginRight: 16,
                  }}
                >
                  <IconAlertTriangle color="#FF6F00" size={22} stroke={2} />
                </div>
                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "18px",
                      color: "#E65100",
                      marginBottom: 2,
                    }}
                  >
                    Subscription Already Active
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#FF6F00",
                      fontWeight: 500,
                    }}
                  >
                    This account has an existing subscription
                  </div>
                </div>
              </div>

              {/* Message content */}
              <div
                style={{
                  marginBottom: data.metadata?.restaurant_id ? 20 : 0,
                  color: "#424242",
                  fontSize: "15px",
                  lineHeight: "1.6",
                  paddingLeft: 56,
                  fontWeight: 400,
                }}
              >
                {data.metadata?.restaurant_id
                  ? "To add another subscription or manage existing ones, please use the restaurant dashboard below."
                  : "This account already has an active subscription for the selected plan."}
              </div>

              {/* Action button */}
              {data.metadata?.restaurant_id && (
                <div
                  style={{
                    paddingLeft: 56,
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Button
                    variant="gradient"
                    gradient={{ from: "#FF6F00", to: "#FF8F00" }}
                    size="md"
                    style={{
                      fontWeight: 600,
                      borderRadius: "10px",
                      boxShadow: "0 4px 12px rgba(255, 111, 0, 0.3)",
                      padding: "12px 24px",
                      fontSize: "14px",
                      textTransform: "none",
                      letterSpacing: "0.3px",
                    }}
                    onClick={() => {
                      toast.dismiss(toastId);
                      router.push(`/restaurant/${data.metadata.restaurant_id}`);
                    }}
                    leftIcon={<IconExternalLink size={18} />}
                  >
                    Open Restaurant Dashboard
                  </Button>
                </div>
              )}
            </div>,
            {
              position: "top-center",
              autoClose: false,
              closeOnClick: false,
              draggable: false,
              transition: Slide,
              style: {
                background: "linear-gradient(135deg, #FFF8E1 0%, #FFF3E0 100%)",
                border: "1px solid #FFB74D",
                color: "#333",
                minWidth: 520,
                maxWidth: 600,
                boxShadow: "0 8px 32px rgba(255, 152, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08)",
                borderRadius: "16px",
                padding: "24px 28px",
                backdropFilter: "blur(8px)",
              },
            }
          );
          return;
        }

        // Handle other errors
        const errorMessage = data.message || "Failed to generate checkout URL";
        const isPhoneError = errorMessage.toLowerCase().includes("phone");

        toast.error(
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              padding: "8px 0",
            }}
          >
            {/* Header with icon and title */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 16,
                width: "100%",
                paddingBottom: 12,
                borderBottom: "1px solid rgba(244, 67, 54, 0.2)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  backgroundColor: "rgba(244, 67, 54, 0.1)",
                  marginRight: 16,
                }}
              >
                <IconX color="#D32F2F" size={22} stroke={2} />
              </div>
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "18px",
                    color: "#C62828",
                    marginBottom: 2,
                  }}
                >
                  {isPhoneError ? "Phone Number Already Exists" : "Error"}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#D32F2F",
                    fontWeight: 500,
                  }}
                >
                  {isPhoneError
                    ? "This phone number is already registered"
                    : "Failed to generate checkout URL"}
                </div>
              </div>
            </div>

            {/* Message content */}
            <div
              style={{
                color: "#424242",
                fontSize: "15px",
                lineHeight: "1.6",
                paddingLeft: 56,
                fontWeight: 400,
              }}
            >
              {errorMessage}
            </div>
          </div>,
          {
            position: "top-center",
            autoClose: 5000,
            closeOnClick: true,
            draggable: true,
            transition: Slide,
            style: {
              background: "linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%)",
              border: "1px solid #EF9A9A",
              color: "#333",
              minWidth: 520,
              maxWidth: 600,
              boxShadow: "0 8px 32px rgba(244, 67, 54, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08)",
              borderRadius: "16px",
              padding: "24px 28px",
              backdropFilter: "blur(8px)",
            },
          }
        );
        return;
      }

      setGeneratedUrl(data.checkoutUrl);

      // Send notification about URL generation using the API endpoint
      const userInfo = `${user?.email}`;
      const trialInfo = trialEnabled ? ` with ${TRIAL_DAYS}-day trial` : "";
      const invoiceInfo = sendInvoices ? " with invoice sending enabled" : "";

      // Use the API endpoint instead of direct method call
      await fetch("/api/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Checkout URL Generated",
          message: `${userInfo} generated a checkout URL${trialInfo}${invoiceInfo}`,
          type: "SUCCESS",
          fields: [
            { label: "Plan", value: selectedPlanData.name },
            {
              label: "Price",
              value: `$${(selectedPlanData.price / 100).toFixed(2)}/month`,
            },
            { label: "Email", value: form.values.email },
            { label: "Customer", value: form.values.customerName },
            { label: "Restaurant", value: form.values.restaurantName },
            { label: "Send Invoices", value: sendInvoices ? "Yes" : "No" },
          ],
        }),
      });
    } catch (error) {
      console.error("Error generating checkout URL:", error);
      // Send error notification to Slack using the API endpoint
      setGeneratedUrl(null);
      fetch("/api/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isError: true,
          message: `Failed to generate checkout URL for ${form.values.email}`,
          context: {
            error: error instanceof Error ? error.message : String(error),
            email: form.values.email,
            customer: form.values.customerName,
            restaurant: form.values.restaurantName,
          },
        }),
      });
    } finally {
      setIsGeneratingUrl(false);
    }
  };

  const getPlanIcon = (tier: string) => {
    const iconProps = { size: 24, stroke: 1.5 };
    switch (tier) {
      case "basic":
        return <IconReceipt {...iconProps} />;
      case "plus":
        return <IconStar {...iconProps} />;
      case "premium":
        return <IconCrown {...iconProps} />;
      default:
        return <IconReceipt {...iconProps} />;
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    return isValidPhoneNumber(phone);
  };

  const fetchRestaurantDetails = async (restaurantId: string) => {
    try {
      const response = await fetch(`/api/restaurants/${restaurantId}`);
      const data = await response.json();

      if (response.ok && data.restaurant) {
        form.setFieldValue("restaurantName", data.restaurant.name);
      }
    } catch (error) {
      console.error("Error fetching restaurant details:", error);
    }
  };

  const checkUserExists = async (value: string, type: "email" | "phone") => {
    if (!value) return;

    // Local validation
    if (type === "email" && !validateEmail(value)) {
      setUserCheckError("Invalid email format");
      return;
    }

    if (type === "phone" && !validatePhone(value)) {
      setUserCheckError("Invalid phone number");
      return;
    }

    setIsCheckingUser(true);
    setUserCheckError(null);

    try {
      setCheckingInfo(true);
      const response = await fetch(
        `/api/users/check-exists?${type}=${encodeURIComponent(
          value.startsWith("+") ? value.replace("+", "") : value
        )}`
      );
      const data = await response.json();

      if (response.ok) {
        if (data.exists) {
          // Fill in the user information
          setEmail(data.user.email);
          form.setFieldValue("email", data.user.email);
          const formattedPhone = data.user.phone
            ? data.user.phone.startsWith("+")
              ? data.user.phone
              : `+${data.user.phone}`
            : "";

          // Ensure the phone number is in E.164 format for the PhoneInput component
          let e164Phone = formattedPhone;
          if (formattedPhone) {
            try {
              const parsed = parsePhoneNumber(formattedPhone);
              e164Phone = parsed ? parsed.format("E.164") : formattedPhone;
            } catch (error) {
              // If parsing fails, use the original formatted phone
              e164Phone = formattedPhone;
            }
          }

          setPhone(e164Phone);
          form.setFieldValue("phoneNumber", e164Phone);
          form.setFieldValue("customerName", data.user.customer_name || "");

          // Fetch restaurant details if restaurant_id exists
          if (data.user.restaurant_id) {
            await fetchRestaurantDetails(data.user.restaurant_id);
          }

          toast.success("updated user info", {
            position: "bottom-center",
            autoClose: 2000,
            hideProgressBar: true,
            closeOnClick: false,
            pauseOnHover: false,
            draggable: false,
            transition: Slide,
            theme: "dark",
            style: {
              // backgroundColor: theme.colors.orange[0],
              color: theme.colors.orange[6],
              width: "fit-content",
              padding: "10px 20px",
              borderRadius: "50px",
              fontSize: "16px",
            },
            closeButton: false,
          });
        }
      } else {
        setUserCheckError(data.message || "Failed to check user existence");
      }
    } catch (error) {
      console.error("Error checking user existence:", error);
      setUserCheckError("An error occurred while checking user existence");
    } finally {
      setIsCheckingUser(false);
      setCheckingInfo(false);
    }
  };

  // Create debounced versions of the check functions
  const debouncedCheckEmail = useCallback(
    debounce((value: string) => {
      if (value) {
        checkUserExists(value, "email");
      }
    }, 500),
    []
  );

  const debouncedCheckPhone = useCallback(
    debounce((value: string) => {
      if (value) {
        checkUserExists(value, "phone");
      }
    }, 500),
    []
  );

  const handleEmailChange = (value: string) => {
    // Trim leading and trailing spaces as user types
    const trimmedValue = value.trim();
    setEmail(trimmedValue);
    form.setFieldValue("email", trimmedValue);
    setUserCheckError(null);

    // Clear other fields when email changes
    setPhone("");
    form.setFieldValue("phoneNumber", "");
    form.setFieldValue("customerName", "");
    form.setFieldValue("restaurantName", "");

    if (trimmedValue) {
      if (!validateEmail(trimmedValue)) {
        setUserCheckError("Invalid email format");
        return;
      }
      debouncedCheckEmail(trimmedValue);
    }
  };

  const handlePhoneChange = (value: string | undefined) => {
    if (!value) {
      setPhone("");
      form.setFieldValue("phoneNumber", "");
      return;
    }

    // Trim leading and trailing spaces
    const trimmedValue = value.trim();

    // Convert to E.164 format
    let e164Phone = trimmedValue;
    try {
      const parsed = parsePhoneNumber(trimmedValue);
      e164Phone = parsed ? parsed.format("E.164") : trimmedValue;
    } catch (error) {
      // If parsing fails, use the trimmed value
      e164Phone = trimmedValue;
    }

    setPhone(e164Phone);
    form.setFieldValue("phoneNumber", e164Phone);
    setUserCheckError(null);

    if (trimmedValue) {
      if (!validatePhone(trimmedValue)) {
        setUserCheckError("Invalid phone number");
        return;
      }
      debouncedCheckPhone(trimmedValue);
    }
  };

  // Cleanup debounced functions on unmount
  useEffect(() => {
    return () => {
      debouncedCheckEmail.cancel();
      debouncedCheckPhone.cancel();
    };
  }, [debouncedCheckEmail, debouncedCheckPhone]);

  const isFormValid = () => {
    const trimmedEmail = form.values.email.trim();
    const trimmedPhone = form.values.phoneNumber ? form.values.phoneNumber.trim() : "";

    return (
      form.values.customerName &&
      form.values.restaurantName &&
      trimmedEmail &&
      validateEmail(trimmedEmail) &&
      (!trimmedPhone || validatePhone(trimmedPhone))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Trim email and phone before validation
    const trimmedEmail = form.values.email.trim();
    const trimmedPhone = form.values.phoneNumber ? form.values.phoneNumber.trim() : "";

    // Check for trailing/leading spaces
    if (form.values.email !== trimmedEmail) {
      form.setFieldError("email", "Email cannot have leading or trailing spaces");
      return;
    }

    if (form.values.phoneNumber && form.values.phoneNumber !== trimmedPhone) {
      setPhoneError("Phone number cannot have leading or trailing spaces");
      return;
    }

    // Update form values with trimmed values
    form.setFieldValue("email", trimmedEmail);
    if (trimmedPhone) {
      form.setFieldValue("phoneNumber", trimmedPhone);
    }

    if (!isFormValid()) {
      return;
    }

    if (!selectedPlan) {
      return;
    }

    await generateCheckoutUrl();
  };

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <Center style={{ height: "100vh" }}>
        <Stack align="center" spacing="md">
          <Loader color="orange" size="xl" />
          <Text color="dimmed">Loading...</Text>
        </Stack>
      </Center>
    );
  }
  // Show AccessDenied only after we're sure auth check is complete
  if ((!isAuthenticated || user?.role !== "flapjack") && !isLoading) {
    return <AccessDenied message="This page is only accessible to Flapjacks" />;
  }

  // Only render the main content when authenticated and user is a flapjack
  return (
    <Container size="xl" py="xl">
      <Paper shadow="xs" p="xl" radius="md" withBorder>
        <LoadingOverlay
          visible={isPlansLoading || checkingInfo}
          color="orange"
          loader={<Loader color="orange" size="lg" variant="dots" />}
          overlayBlur={2}
          overlayOpacity={0.8}
          transitionDuration={300}
        />
        <Stack spacing="xl">
          <Group position="apart" align="center">
            <Title order={2} size="h3" weight={600} sx={{ display: "flex", alignItems: "center" }}>
              Create Checkout URL
              <sub style={{ fontSize: 12, color: "#868e96", marginLeft: 6, verticalAlign: "sub" }}>
                for new customers or those with expired/cancelled subscriptions
              </sub>
            </Title>
            <Group spacing="xl">
              <Tooltip
                label={trialEnabled ? "Disable trial" : "Enable trial"}
                withArrow
                position="top"
              >
                <Group spacing="xs" align="center">
                  <Switch
                    checked={trialEnabled}
                    onChange={(event) => setTrialEnabled(event.currentTarget.checked)}
                    label={`${TRIAL_DAYS}-Day Trial`}
                    labelPosition="left"
                    size="md"
                    onLabel="ON"
                    offLabel="OFF"
                    color="orange"
                    thumbIcon={
                      trialEnabled ? (
                        <IconCheck
                          size={12}
                          color={theme.colors.teal[theme.fn.primaryShade()]}
                          stroke={3}
                        />
                      ) : (
                        <IconX
                          size={12}
                          color={theme.colors.red[theme.fn.primaryShade()]}
                          stroke={3}
                        />
                      )
                    }
                    styles={() => ({
                      root: { cursor: "pointer" },
                      input: { cursor: "pointer" },
                      track: { cursor: "pointer" },
                      thumb: { cursor: "pointer" },
                      label: { cursor: "pointer", fontWeight: 600 },
                    })}
                  />
                </Group>
              </Tooltip>
            </Group>
          </Group>

          <form onSubmit={handleSubmit}>
            <Stack spacing="md">
              {/* First row: Email and Phone Number */}
              <Grid>
                <Grid.Col span={6}>
                  <TextInput
                    required
                    label="Email"
                    placeholder="name@domain.tld"
                    value={email}
                    onChange={(e) => handleEmailChange(e.currentTarget.value)}
                    rightSection={
                      email ? (
                        validateEmail(email) ? (
                          <IconCheck size={16} color="green" />
                        ) : (
                          <IconX size={16} color="red" />
                        )
                      ) : null
                    }
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <Box>
                    <Text size="sm" weight={500} mb={5}>
                      Phone Number (Optional)
                    </Text>
                    <PhoneInput
                      placeholder="Enter phone number"
                      value={phone}
                      onChange={handlePhoneChange}
                      className="input-phone"
                      defaultCountry="US"
                      international
                      withCountryCallingCode
                      style={{ width: "100%" }}
                    />
                    {phoneError && (
                      <Text size="xs" color="red" mt={5}>
                        {phoneError}
                      </Text>
                    )}
                  </Box>
                </Grid.Col>
              </Grid>

              {/* Second row: Customer Name and Restaurant Name */}
              <Grid>
                <Grid.Col span={6}>
                  <TextInput
                    required
                    label="Customer Name"
                    placeholder="John Doe"
                    {...form.getInputProps("customerName")}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    required
                    label="Restaurant Name"
                    placeholder="Restaurant Name"
                    {...form.getInputProps("restaurantName")}
                  />
                </Grid.Col>
              </Grid>
            </Stack>

            <Group position="apart" align="center" mt="xl">
              <Group spacing="xl">
                {/* <Tooltip
                  label="Send invoices to customer email"
                  withArrow
                  position="top"
                >
                  <Group spacing="xs" align="center">
                    <Checkbox
                      checked={sendInvoices}
                      onChange={(event) =>
                        setSendInvoices(event.currentTarget.checked)
                      }
                      label="Send Invoices"
                      color="orange"
                    />
                  </Group>
                </Tooltip> */}
              </Group>
            </Group>

            <Grid mt="xl">
              {plans.map((plan) => (
                <Grid.Col key={plan.id} span={isMobile ? 12 : 4}>
                  <Card
                    p="xl"
                    radius="md"
                    sx={(theme) => ({
                      height: "100%",
                      cursor: "pointer",
                      backgroundColor:
                        selectedPlan === plan.id ? theme.colors.orange[0] : theme.white,
                      border: `1px solid ${
                        selectedPlan === plan.id ? theme.colors.orange[6] : theme.colors.gray[2]
                      }`,
                      ...(selectedPlan !== plan.id && {
                        "&:hover": {
                          boxShadow: theme.shadows.lg,
                        },
                      }),
                    })}
                    onClick={() => handlePlanSelection(plan.id)}
                  >
                    <Stack spacing="xl">
                      <Group spacing="md" align="flex-start">
                        <ThemeIcon
                          size={48}
                          radius="md"
                          variant="light"
                          color={selectedPlan === plan.id ? "orange" : "gray"}
                          sx={(theme) => ({
                            backgroundColor:
                              selectedPlan === plan.id
                                ? theme.colors.orange[1]
                                : theme.colors.gray[0],
                          })}
                        >
                          {getPlanIcon(plan.features.tier)}
                        </ThemeIcon>
                        <Box>
                          <Text weight={700} size="xl" mb={4}>
                            {plan.name}
                          </Text>
                          <Text
                            size="xl"
                            weight={800}
                            color={selectedPlan === plan.id ? "orange" : "dark"}
                            sx={{ letterSpacing: "-0.5px" }}
                          >
                            ${(plan.price / 100).toFixed(2)}
                            <Text span size="sm" weight={500} color="dimmed" ml={4}>
                              /month
                            </Text>
                          </Text>
                        </Box>
                      </Group>
                      <Box>
                        <Text
                          size="sm"
                          color="dimmed"
                          sx={{
                            lineHeight: 1.8,
                            letterSpacing: "0.2px",
                          }}
                        >
                          {plan.description}
                        </Text>
                      </Box>
                    </Stack>
                  </Card>
                </Grid.Col>
              ))}
            </Grid>

            <Stack align="center" spacing="sm" mt="xl">
              <Button
                type="submit"
                disabled={!selectedPlan || isGeneratingUrl || !isFormValid()}
                size="md"
                radius="md"
                leftIcon={!isGeneratingUrl && <IconClipboard size={20} stroke={1.5} />}
                sx={(theme) => ({
                  minWidth: 220,
                  backgroundColor: theme.colors.orange[1],
                  color: theme.colors.orange[6],
                  "&:hover": {
                    backgroundColor: theme.colors.orange[2],
                  },
                })}
              >
                {isGeneratingUrl ? (
                  <Center>
                    <Loader color="orange" size="md" variant="dots" />
                  </Center>
                ) : (
                  "Generate Checkout URL"
                )}
              </Button>
            </Stack>
          </form>

          {generatedUrl && (
            <Transition mounted={true} transition="fade" duration={400} timingFunction="ease">
              {(styles) => (
                <Paper
                  style={styles}
                  withBorder
                  p="md"
                  radius="md"
                  sx={(theme) => ({
                    backgroundColor: theme.colors.orange[0],
                    borderColor: theme.colors.orange[3],
                  })}
                >
                  <Stack spacing="xs">
                    <Text weight={600} size="sm" color="orange">
                      Generated Checkout URL
                    </Text>
                    <Group spacing="xs" noWrap>
                      <Text size="sm" sx={{ flex: 1 }} truncate>
                        {generatedUrl}
                      </Text>
                      <CopyButton value={generatedUrl} timeout={2000}>
                        {({ copied, copy }) => (
                          <Tooltip
                            label={copied ? "Copied!" : "Copy URL"}
                            withArrow
                            position="left"
                          >
                            <ActionIcon
                              color={copied ? "teal" : "orange"}
                              onClick={copy}
                              variant="light"
                            >
                              {copied ? <IconCheck size={16} /> : <IconClipboard size={16} />}
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </CopyButton>
                      <Tooltip label="Open in new tab" withArrow position="right">
                        <ActionIcon
                          component="a"
                          href={generatedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          color="orange"
                          variant="light"
                        >
                          <IconExternalLink size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Stack>
                </Paper>
              )}
            </Transition>
          )}
        </Stack>
      </Paper>
    </Container>
  );
}
