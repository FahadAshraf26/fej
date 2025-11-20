import { Box, Stack, Card, Text, Group, Center, ThemeIcon } from "@mantine/core";
import { IconPhoneCall, IconLink } from "@tabler/icons";
import Image from "next/image";

interface OnboardingCardProps {
  onTalkToSales?: () => void;
  onLinkRestaurant?: () => void;
}

const OnboardingCard = ({ onTalkToSales, onLinkRestaurant }: OnboardingCardProps) => {
  return (
    <Center style={{ minHeight: "70vh", width: "100%" }}>
      <Card
        shadow="xl"
        radius="lg"
        p="xl"
        style={{
          maxWidth: 400,
          width: "100%",
          borderRadius: 18,
          boxShadow: "0 12px 48px 0 rgba(0,0,0,0.32)",
          background: "#fff",
          border: "none",
        }}
        withBorder={false}
      >
        <Stack spacing="xl" align="center">
          <Image
            src="/logo.svg"
            alt="Flapjack Logo"
            width={72}
            height={72}
            style={{ marginBottom: 8 }}
          />
          <Text align="center" fw={700} fz="xl" style={{ marginBottom: 0 }}>
            Welcome to Flapjack
          </Text>
          <Text align="center" color="dimmed" fz="md" style={{ marginTop: -8 }}>
            To start creating beautiful menus for your restaurant,
            <br />
            you&apos;ll need to complete one more step.
          </Text>
          <Stack spacing="md" style={{ width: "100%" }}>
            <Card
              withBorder
              radius="md"
              p="md"
              style={{
                cursor: "pointer",
                background: "#fff",
                borderColor: "#E9ECEF",
                boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              }}
              onClick={onTalkToSales}
            >
              <Group spacing={16} align="center" noWrap>
                <ThemeIcon
                  size={40}
                  radius={100}
                  color="orange"
                  variant="light"
                  style={{ alignSelf: "center" }}
                >
                  <IconPhoneCall size={22} />
                </ThemeIcon>
                <Box style={{ flex: 1 }}>
                  <Text fw={700} fz="md">
                    Talk to Sales
                  </Text>
                  <Text color="dimmed" fz="md">
                    Get a personalized onboarding experience with our team
                  </Text>
                </Box>
              </Group>
            </Card>
            <Text align="center" color="gray" fz="sm" style={{ margin: "-8px 0" }}>
              or
            </Text>
            <Card
              withBorder
              radius="md"
              p="md"
              style={{
                cursor: "pointer",
                background: "#fff",
                borderColor: "#E9ECEF",
                boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              }}
              onClick={onLinkRestaurant}
            >
              <Group spacing={16} align="center" noWrap>
                <ThemeIcon
                  size={40}
                  radius={100}
                  color="orange"
                  variant="light"
                  style={{ alignSelf: "center" }}
                >
                  <IconLink size={22} />
                </ThemeIcon>
                <Box style={{ flex: 1 }}>
                  <Text fw={700} fz="md">
                    Link Existing Restaurant
                  </Text>
                  <Text color="dimmed" fz="md">
                    Connect your account to your restaurant&apos;s profile
                  </Text>
                </Box>
              </Group>
            </Card>
          </Stack>
          <Text align="center" color="gray" fz="xs" mt="md">
            Need help? Contact support at <a href="mailto:howdy@flapjack.co">howdy@flapjack.co</a>
          </Text>
        </Stack>
      </Card>
    </Center>
  );
};

export default OnboardingCard;
