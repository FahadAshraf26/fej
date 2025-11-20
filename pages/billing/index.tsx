import React, { useEffect, useState } from "react";
import { Container, Tabs, Paper, Title, Text, Box } from "@mantine/core";
import { useUserContext } from "@Context/UserContext";
import AccessDenied from "@Components/CommonComponents/AccessDenied";
import SubscriptionPlans from "@Components/billing/SubscriptionPlans";
import TrialManagement from "@Components/billing/TrialManagement";
import { useRouter } from "next/router";
import { AppShell } from "@mantine/core";

export default function BillingPage() {
  const { isAuthenticated, user, isLoading } = useUserContext();
  const router = useRouter();
  const { tab: tabParam, data } = router.query;
  const [activeTab, setActiveTab] = useState<string | null>(
    (tabParam as string) || "subscriptions"
  );
  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    if (data) {
      try {
        const decodedData = JSON.parse(atob(data as string));
        setFormData(decodedData);
      } catch (error) {
        console.error("Error decoding data:", error);
      }
    }
  }, [data]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(
      {
        pathname: router.pathname,
        query: { tab: value },
      },
      undefined,
      { shallow: true }
    );
  };

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated || user?.role !== "flapjack") {
    return <AccessDenied message="This page is only accessible to Flapjacks" />;
  }

  return (
    <Container size="xl" style={{ minHeight: "100vh", padding: "20px 0" }}>
      <Paper shadow="xs" p="xl" radius="md" withBorder>
        <Tabs
          value={activeTab}
          onTabChange={handleTabChange}
          styles={(theme) => ({
            tab: {
              "&[data-active]": {
                borderColor: theme.colors.orange[6],
                color: theme.colors.orange[6],
              },
              "&:hover": {
                backgroundColor: theme.colors.orange[0],
              },
            },
            tabsList: {
              borderBottom: `2px solid ${theme.colors.gray[2]}`,
            },
          })}
        >
          <Tabs.List>
            <Tabs.Tab value="subscriptions">Subscriptions</Tabs.Tab>
            <Tabs.Tab value="trials">Trials</Tabs.Tab>
          </Tabs.List>

          <Box mt="xl">
            <Tabs.Panel value="subscriptions">
              <SubscriptionPlans initialData={formData} />
            </Tabs.Panel>

            <Tabs.Panel value="trials">
              <TrialManagement />
            </Tabs.Panel>
          </Box>
        </Tabs>
      </Paper>
    </Container>
  );
}
