import React from "react";
import { useMantineTheme } from "@mantine/core";
import { BaseSubscriptionCard } from "./BaseSubscriptionCard";
import { SubscriptionCardProps } from "../types";

interface ActiveSubscriptionCardProps extends SubscriptionCardProps {
  onCancel: (subscription: any) => void;
  isFlapjack: boolean;
}

export const ActiveSubscriptionCard: React.FC<ActiveSubscriptionCardProps> = (props) => {
  const theme = useMantineTheme();

  return (
    <BaseSubscriptionCard
      {...props}
      statusLabel="MONTHLY PAYMENT"
      statusBadge="ACTIVE NOW"
      dateLabel="Current billing period"
      showCancelAction={props.isFlapjack}
      styleProps={{
        cardBackground: "linear-gradient(135deg, #e6f7f5 0%, #eaf7ff 100%)",
        statusColor: theme.colors.teal[6],
        statusBgColor: theme.colors.teal[0],
        priceColor: theme.colors.teal[7],
        editBtnColor: theme.colors.teal[6],
        editBtnBgColor: "white",
      }}
    />
  );
};
