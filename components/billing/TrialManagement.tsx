import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Paper,
  Title,
  Text,
  Stack,
  TextInput,
  Button,
  Table,
  Group,
  Loader,
  NumberInput,
  ActionIcon,
  Tooltip,
  Pagination,
  Center,
  Modal,
  Badge,
  Alert,
  ThemeIcon,
} from "@mantine/core";
import { IconSearch, IconClock, IconAlertCircle, IconCheck } from "@tabler/icons";
import { useUserContext } from "@Context/UserContext";
import AccessDenied from "@Components/CommonComponents/AccessDenied";
import { showNotification } from "@mantine/notifications";
import { useRouter } from "next/router";
import { TRIAL_DAYS, MAX_TRIAL_EXTENSIONS, MAX_TRIAL_EXTENSION_DAYS } from "@Config/app-settings";

interface Subscription {
  status: string;
  trial_end_date: string;
  trial_activated: boolean;
  stripe_subscription_id: string;
  trial_extended_count: number;
  trial_extended_days: number;
  trial_start_date: string;
  original_trial_end_date: string;
  restaurants: {
    name: string;
  };
}

interface TrialUser {
  id: string;
  email: string;
  customer_name: string | null;
  restaurant_id: string;
  subscriptionActive: boolean;
  stripe_customer_id: string | null;
  subscriptions: Subscription[];
}

export default function TrialManagement() {
  const { isAuthenticated, user, isLoading } = useUserContext();
  const router = useRouter();
  const [trialUsers, setTrialUsers] = useState<TrialUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<TrialUser | null>(null);
  const [extensionDays, setExtensionDays] = useState<string>("7");
  const [isExtending, setIsExtending] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrialUsers = useCallback(async (page: number, search: string = "") => {
    try {
      setIsLoadingUsers(true);
      const response = await fetch(
        `/api/billing/subscriptions/trial?page=${page}&search=${search}`
      );
      const data = await response.json();

      if (response.ok) {
        setTrialUsers(data.users);
        setTotalPages(data.totalPages);
      } else {
        console.error("Failed to fetch trial users:", data.message);
        showNotification({
          title: "Error",
          message: "Failed to fetch trial users",
          color: "red",
        });
      }
    } catch (error) {
      console.error("Error fetching trial users:", error);
      showNotification({
        title: "Error",
        message: "An error occurred while fetching trial users",
        color: "red",
      });
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  // Fetch data when tab becomes active
  useEffect(() => {
    if (
      router.query.tab === "trials" &&
      !isLoading &&
      isAuthenticated &&
      user?.role === "flapjack"
    ) {
      fetchTrialUsers(currentPage, searchQuery);
    }
  }, [
    router.query.tab,
    isAuthenticated,
    user,
    isLoading,
    currentPage,
    searchQuery,
    fetchTrialUsers,
  ]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const calculateMaxExtensionDays = (user: TrialUser) => {
    const originalTrialDays = TRIAL_DAYS;
    const maxTotalTrialDays = MAX_TRIAL_EXTENSION_DAYS;
    const alreadyExtendedDays = user.subscriptions[0]?.trial_extended_days || 0;
    return maxTotalTrialDays - originalTrialDays - alreadyExtendedDays;
  };

  const handleExtendTrial = async (user: TrialUser) => {
    const maxDays = calculateMaxExtensionDays(user);
    const days = parseInt(extensionDays);

    if (isNaN(days) || days < 1 || days > maxDays) {
      setError(`Extension days must be between 1 and ${maxDays}`);
      return;
    }

    setIsExtending(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/subscriptions/trial/extend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: user.stripe_customer_id,
          subscriptionId: user.subscriptions[0]?.stripe_subscription_id,
          days: days,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showNotification({
          title: "Success",
          message: `Trial extended by ${days} days for ${user.email}`,
          color: "green",
          icon: <IconCheck size={16} />,
        });
        // Refresh the trial users list with current search query
        fetchTrialUsers(currentPage, searchQuery);
        setIsModalOpen(false);
        setSelectedUser(null);
        setExtensionDays("7");
      } else {
        setError(data.message || "Failed to extend trial");
        showNotification({
          title: "Error",
          message: data.message || "Failed to extend trial",
          color: "red",
        });
      }
    } catch (error) {
      console.error("Error extending trial:", error);
      setError("An error occurred while extending the trial");
      showNotification({
        title: "Error",
        message: "An error occurred while extending the trial",
        color: "red",
      });
    } finally {
      setIsExtending(false);
    }
  };

  const openExtendModal = (user: TrialUser) => {
    setSelectedUser(user);
    setExtensionDays("7");
    setError(null);
    setIsModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatExtensionCount = (count: number, days: number) => {
    if (count === 0) return "None";
    if (count === 1) return `1 time${days ? ` (${days} ${days === 1 ? "day" : "days"})` : ""}`;
    return `${count} times${days ? ` (${days} ${days === 1 ? "day" : "days"})` : ""}`;
  };

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

  if (!isAuthenticated || user?.role !== "flapjack") {
    return <AccessDenied message="This page is only accessible to Flapjacks" />;
  }

  return (
    <Container size="xl" py="xl">
      <Paper shadow="xs" p="xl" radius="md" withBorder>
        <Stack spacing="xl">
          <Title order={2} size="h3" weight={600}>
            Trial Management
          </Title>

          <Group position="apart">
            <TextInput
              placeholder="Search by email or name"
              value={searchQuery}
              onChange={(e) => handleSearch(e.currentTarget.value)}
              icon={<IconSearch size={16} />}
              style={{ width: 300 }}
            />
          </Group>

          {isLoadingUsers ? (
            <Center py="xl">
              <Loader color="orange" />
            </Center>
          ) : (
            <>
              <Table striped highlightOnHover>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Restaurant</th>
                    <th>Trial Start</th>
                    <th>Trial End</th>
                    <th>Original End</th>
                    <th>Extensions</th>
                    {/* <th>Status</th> */}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {trialUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td>{user.customer_name || "N/A"}</td>
                      <td>{user.subscriptions[0]?.restaurants.name || "N/A"}</td>
                      <td>{formatDate(user.subscriptions[0]?.trial_start_date)}</td>
                      <td>{formatDate(user.subscriptions[0]?.trial_end_date)}</td>
                      <td>{formatDate(user.subscriptions[0]?.original_trial_end_date)}</td>
                      <td>
                        {formatExtensionCount(
                          user.subscriptions[0]?.trial_extended_count || 0,
                          user.subscriptions[0]?.trial_extended_days || 0
                        )}
                      </td>
                      {/* <td>
                        <Badge
                          color={user.subscriptions[0]?.status === "trialing" ? "blue" : "gray"}
                        >
                          {user.subscriptions[0]?.status === "trialing"
                            ? "On Trial"
                            : "Not on Trial"}
                        </Badge>
                      </td> */}
                      <td>
                        <Group spacing="xs">
                          <Tooltip
                            label={
                              user.subscriptions[0]?.trial_extended_days >= MAX_TRIAL_EXTENSIONS
                                ? "Max extensions reached"
                                : "Extend Trial"
                            }
                          >
                            <ActionIcon
                              color="orange"
                              onClick={() => openExtendModal(user)}
                              disabled={
                                user.subscriptions[0]?.status !== "trialing" ||
                                user.subscriptions[0]?.trial_extended_days >= MAX_TRIAL_EXTENSIONS
                              }
                            >
                              <IconClock size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              <Group position="center">
                <Pagination
                  total={totalPages}
                  page={currentPage}
                  onChange={setCurrentPage}
                  color="orange"
                />
              </Group>
            </>
          )}

          <Modal
            opened={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="Extend Trial Period"
            size="md"
            centered
          >
            {selectedUser && (
              <Stack spacing="md">
                <Text>
                  Extend trial period for <strong>{selectedUser.email}</strong>
                </Text>

                {error && (
                  <Alert
                    icon={<IconAlertCircle size={16} />}
                    title="Error"
                    color="red"
                    variant="filled"
                  >
                    {error}
                  </Alert>
                )}

                <TextInput
                  label={`Extension Days (Max: ${calculateMaxExtensionDays(selectedUser)} days)`}
                  description="Enter number of days to extend the trial"
                  value={extensionDays}
                  onChange={(e) => {
                    const value = e.currentTarget.value.replace(/[^0-9]/g, "");
                    setExtensionDays(value);
                    setError(null);
                  }}
                  error={error}
                />

                <Group position="right" mt="md">
                  <Button
                    variant="subtle"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isExtending}
                  >
                    Cancel
                  </Button>
                  <Button
                    color="orange"
                    onClick={() => handleExtendTrial(selectedUser)}
                    loading={isExtending}
                  >
                    Extend Trial
                  </Button>
                </Group>
              </Stack>
            )}
          </Modal>
        </Stack>
      </Paper>
    </Container>
  );
}
