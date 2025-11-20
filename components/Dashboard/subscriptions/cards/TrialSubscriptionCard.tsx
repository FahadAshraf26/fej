import React from "react";
import { Box, Text, useMantineTheme } from "@mantine/core";
import { BaseSubscriptionCard } from "./BaseSubscriptionCard";
import { SubscriptionCardProps } from "../types";
import { calculateDaysLeft, formatDate } from "../../../../utils/helpers";

interface TrialSubscriptionCardProps extends SubscriptionCardProps {
  onCancel?: (subscription: any) => void;
}

export const TrialSubscriptionCard: React.FC<TrialSubscriptionCardProps> = (props) => {
  const theme = useMantineTheme();
  const { subscription } = props;

  // Calculate days left in trial
  const daysLeft = calculateDaysLeft(subscription.trial_end_date);
  const daysLeftText =
    daysLeft !== null ? (daysLeft > 0 ? `${daysLeft} DAYS LEFT` : "Trial ended") : null;

  return (
    <BaseSubscriptionCard
      {...props}
      statusLabel="TRIAL PERIOD"
      statusBadge={daysLeftText || "TRIAL"}
      dateLabel="Trial ends on"
      showCancelAction={!!props.onCancel}
      styleProps={{
        cardBackground: "linear-gradient(135deg, #e6f7f5 0%, #eaf7ff 100%)",
        statusColor: theme.colors.blue[6],
        statusBgColor: theme.colors.blue[0],
        priceColor: theme.colors.blue[7],
        editBtnColor: theme.colors.blue[6],
        editBtnBgColor: "white",
      }}
      footerContent={
        <Text size="sm" mt={1} color="dimmed">
          {subscription.trial_end_date ? formatDate(subscription.trial_end_date) : "Not specified"}
        </Text>
      }
    />
  );
};
