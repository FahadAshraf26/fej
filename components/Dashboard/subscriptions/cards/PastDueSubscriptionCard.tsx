import React from "react";
import { useMantineTheme } from "@mantine/core";
import { BaseSubscriptionCard } from "./BaseSubscriptionCard";
import { SubscriptionCardProps } from "../types";

interface PastDueSubscriptionCardProps extends SubscriptionCardProps {
  onCancel?: (subscription: any) => void;
}

export const PastDueSubscriptionCard: React.FC<PastDueSubscriptionCardProps> = (props) => {
  const theme = useMantineTheme();

  return (
    <BaseSubscriptionCard
      {...props}
      statusLabel="MONTHLY PAYMENT"
      statusBadge="PAST DUE"
      dateLabel="Last paid period"
      showCancelAction={!!props.onCancel}
      styleProps={{
        cardBackground: "linear-gradient(135deg, #fffbe6 0%, #fff9db 100%)",
        statusColor: theme.colors.yellow[7],
        statusBgColor: theme.colors.yellow[0],
        priceColor: theme.colors.yellow[8],
        editBtnColor: theme.colors.yellow[7],
        editBtnBgColor: "white",
      }}
    />
  );
};
