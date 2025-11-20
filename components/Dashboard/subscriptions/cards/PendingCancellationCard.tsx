import React, { useRef, useEffect, useState } from "react";
import { Group, Text, Box, useMantineTheme, Tooltip, Loader } from "@mantine/core";
import { IconAlertCircle, IconRefresh } from "@tabler/icons";
import { BaseSubscriptionCard } from "./BaseSubscriptionCard";
import { SubscriptionCardProps } from "../types";
import { formatDate, getCancellationDate } from "../../../../utils/helpers";

interface PendingCancellationCardProps extends SubscriptionCardProps {
  onUndoCancel: (subscription: any) => void;
  isUndoCancelLoading?: boolean;
}

export const PendingCancellationCard: React.FC<PendingCancellationCardProps> = (props) => {
  const { subscription, onUndoCancel, isFlapjack, isUndoCancelLoading = false } = props;
  const theme = useMantineTheme();
  const commentRef = useRef<HTMLSpanElement>(null);
  const [isClamped, setIsClamped] = useState(false);

  useEffect(() => {
    const el = commentRef.current;
    if (el) {
      setIsClamped(el.scrollWidth > el.clientWidth);
    }
  }, [subscription.comment]);

  const handleUndoCancel = () => {
    if (isUndoCancelLoading) return;
    onUndoCancel(subscription);
  };

  // Determine card theme - keep the original card's theme but add "pending cancellation" status
  const baseTheme =
    subscription.status === "trialing"
      ? { color: theme.colors.blue, label: "TRIAL PERIOD" }
      : { color: theme.colors.teal, label: "MONTHLY PAYMENT" };

  // Get the cancellation date
  const cancellationDate = getCancellationDate(subscription.cancel_at);

  return (
    <BaseSubscriptionCard
      {...props}
      statusLabel={baseTheme.label}
      statusBadge="PENDING CANCELLATION"
      dateLabel="Active until"
      hideEditButton={false}
      onEdit={handleUndoCancel}
      customIcon={isUndoCancelLoading ? <Loader size={16} /> : <IconRefresh size={18} />}
      customTooltip={isUndoCancelLoading ? "Processing..." : "Reactivate Subscription"}
      styleProps={{
        cardBackground: "linear-gradient(135deg, #fff6e6 0%, #fff1e1 100%)",
        statusColor: theme.colors.orange[6],
        statusBgColor: theme.colors.orange[0],
        priceColor: theme.colors.orange[7],
        editBtnColor: theme.colors.orange[6],
        editBtnBgColor: "white",
      }}
      additionalSection={
        <Box
          mt={12}
          p="xs"
          sx={{
            background: theme.fn.rgba(theme.colors.orange[0], 0.7),
            border: `1px solid ${theme.fn.rgba(theme.colors.orange[3], 0.3)}`,
            borderRadius: theme.radius.sm,
          }}
        >
          <Group spacing={6} mb={4}>
            <IconAlertCircle size={14} color={theme.colors.orange[6]} />
            <Text size="xs" color={theme.colors.orange[7]} weight={600}>
              Scheduled to cancel on {cancellationDate}
            </Text>
          </Group>

          {subscription.comment && (
            <Text
              size="xs"
              color="dimmed"
              mt={2}
              sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              Reason:{" "}
              {isClamped ? (
                <Tooltip label={subscription.comment} multiline maw={300} withArrow>
                  <span ref={commentRef} style={{ color: theme.colors.red[6], cursor: "pointer" }}>
                    {subscription.comment}
                  </span>
                </Tooltip>
              ) : (
                <span ref={commentRef} style={{ color: theme.colors.red[6] }}>
                  {subscription.comment}
                </span>
              )}
            </Text>
          )}
        </Box>
      }
      hideDescription={true}
      isEditButtonDisabled={isUndoCancelLoading}
    />
  );
};
