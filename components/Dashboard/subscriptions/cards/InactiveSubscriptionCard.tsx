import React from "react";
import { useMantineTheme } from "@mantine/core";
import { BaseSubscriptionCard } from "./BaseSubscriptionCard";
import { SubscriptionCardProps } from "../types";

export const InactiveSubscriptionCard: React.FC<SubscriptionCardProps> = (props) => {
  const theme = useMantineTheme();

  return (
    <BaseSubscriptionCard
      {...props}
      statusLabel="MONTHLY PAYMENT"
      statusBadge="INACTIVE"
      dateLabel="Last active period"
      hideEditButton={true}
      styleProps={{
        cardBackground: theme.colors.gray[0],
        statusColor: theme.colors.gray[6],
        statusBgColor: theme.colors.gray[1],
        priceColor: theme.colors.gray[7],
      }}
    />
  );
};
