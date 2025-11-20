import React from "react";
import { Paper, Stack, Box, Text, Button, useMantineTheme } from "@mantine/core";
import { IconPackage, IconArrowRight } from "@tabler/icons";
import { useRouter } from "next/router";
import { EmptySubscriptionStateProps } from "../types";

export const EmptySubscriptionState: React.FC<EmptySubscriptionStateProps> = ({
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
        borderColor: theme.fn.rgba(theme.colors.yellow[3], 0.15),
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
                from: theme.colors.yellow[1],
                to: theme.colors.yellow[0],
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
                from: theme.colors.yellow[5],
                to: theme.colors.yellow[4],
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
            color={theme.colors.orange[7]}
            sx={{ letterSpacing: "-0.5px" }}
          >
            No Active Subscriptions
          </Text>
        </Stack>

        {userRole === "flapjack" && (
          <Button
            rightIcon={<IconArrowRight size={16} />}
            color="orange"
            size="md"
            onClick={() => router.push("/billing")}
            variant="filled"
            sx={{
              background: theme.fn.gradient({
                from: theme.colors.orange[6],
                to: theme.colors.orange[7],
                deg: 45,
              }),
              "&:hover": {
                background: theme.fn.gradient({
                  from: theme.colors.orange[7],
                  to: theme.colors.orange[8],
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
