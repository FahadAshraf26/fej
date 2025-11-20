import React, { useRef, useEffect, useState } from "react";
import { useMantineTheme, Text, Box, Tooltip } from "@mantine/core";
import { BaseSubscriptionCard } from "./BaseSubscriptionCard";
import { CanceledSubscriptionCardProps } from "../types";

export const CanceledSubscriptionCard: React.FC<CanceledSubscriptionCardProps> = (props) => {
  const theme = useMantineTheme();
  const { subscription } = props;
  const commentRef = useRef<HTMLSpanElement>(null);
  const [isClamped, setIsClamped] = useState(false);

  useEffect(() => {
    const el = commentRef.current;
    if (el) {
      setIsClamped(el.scrollWidth > el.clientWidth);
    }
  }, [subscription.comment]);

  // Get cancellation reason if available
  const cancelReason = subscription.comment || "No reason provided.";

  return (
    <BaseSubscriptionCard
      {...props}
      statusLabel="SUBSCRIPTION STATUS"
      statusBadge="CANCELED"
      dateLabel="Last active period"
      hideEditButton={true}
      styleProps={{
        cardBackground: theme.colors.gray[1],
        statusColor: theme.colors.gray[7],
        statusBgColor: theme.colors.gray[2],
        priceColor: theme.colors.gray[7],
      }}
      additionalSection={
        <Box mt={8}>
          <Text size="sm" color="dimmed" weight={500}>
            Reason for cancellation
          </Text>

          <Text
            size="sm"
            mt={2}
            sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {isClamped ? (
              <Tooltip label={cancelReason} multiline maw={300} withArrow>
                <span ref={commentRef} style={{ color: theme.colors.red[6], cursor: "pointer" }}>
                  {cancelReason}
                </span>
              </Tooltip>
            ) : (
              <span ref={commentRef} style={{ color: theme.colors.red[6] }}>
                {cancelReason}
              </span>
            )}
          </Text>
        </Box>
      }
    />
  );
};
