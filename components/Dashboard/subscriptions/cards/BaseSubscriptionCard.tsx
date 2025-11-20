import React, { useRef, useState, useEffect } from "react";
import {
  Paper,
  Group,
  Box,
  Text,
  ActionIcon,
  Stack,
  createStyles,
  useMantineTheme,
  Tooltip,
} from "@mantine/core";
import { IconEdit, IconStar, IconClock, IconTrash } from "@tabler/icons";
import { SubscriptionCardProps } from "../types";
import { formatPrice, formatDate } from "../../../../utils/helpers";
import { ClampedTextWithTooltip } from "../ClampedTextWithTooltip";

interface BaseSubscriptionCardStyleProps {
  cardBackground: string;
  statusColor: string;
  statusBgColor: string;
  priceColor: string;
  editBtnColor?: string;
  editBtnBgColor?: string;
}

interface BaseSubscriptionCardProps extends SubscriptionCardProps {
  statusLabel: string;
  statusBadge: string;
  dateLabel: string;
  styleProps: BaseSubscriptionCardStyleProps;
  additionalSection?: React.ReactNode;
  footerContent?: React.ReactNode;
  onCancel?: (subscription: any) => void;
  showCancelAction?: boolean;
  hideEditButton?: boolean;
  customIcon?: React.ReactNode;
  customTooltip?: string;
  hideDescription?: boolean;
  isEditButtonDisabled?: boolean;
}

// Create styles for subscription cards
const useStyles = createStyles((theme, props: BaseSubscriptionCardStyleProps) => ({
  card: {
    position: "relative",
    overflow: "hidden",
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    boxShadow: theme.shadows.sm,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    background: props.cardBackground,
  },
  section: {
    backgroundColor: "white",
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    cursor: "default",
    overflow: "visible",
  },
  lastSection: {
    marginBottom: 0,
  },
  actionButton: {
    borderRadius: theme.radius.xl,
    backgroundColor: props.editBtnBgColor || "white",
    color: props.editBtnColor || props.statusColor,
    "&:hover": {
      backgroundColor: theme.colors.gray[0],
    },
  },
  deleteButton: {
    borderRadius: theme.radius.xl,
    backgroundColor: "white",
    color: theme.colors.red[6],
    "&:hover": {
      backgroundColor: theme.fn.rgba(theme.colors.red[0], 0.7),
    },
  },
  planName: {
    // Removed display: "flex" and alignItems: "center" to allow ellipsis to work
  },
  priceLabel: {
    fontWeight: 500,
    textTransform: "uppercase",
    fontSize: theme.fontSizes.xs,
    color: props.statusColor,
  },
  price: {
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1,
    color: props.priceColor,
    marginTop: 2,
  },
  statusBadge: {
    background: props.statusBgColor,
    color: props.statusColor,
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    padding: "2px 16px",
    minHeight: 28,
    display: "flex",
    alignItems: "center",
    letterSpacing: 0.2,
  },
}));

export const BaseSubscriptionCard: React.FC<BaseSubscriptionCardProps> = ({
  subscription,
  onEdit,
  onCancel,
  isFlapjack,
  statusLabel,
  statusBadge,
  dateLabel,
  styleProps,
  additionalSection,
  footerContent,
  showCancelAction = false,
  hideEditButton = false,
  customIcon,
  customTooltip,
  hideDescription = false,
  isEditButtonDisabled = false,
}) => {
  const { classes, cx } = useStyles(styleProps);
  const theme = useMantineTheme();

  const handleCancelClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    if (onCancel) onCancel(subscription);
  };

  return (
    <Paper className={classes.card} p="lg">
      <Group position="apart" mb="md">
        <Box className={classes.section} py="xs" px="md">
          <Group spacing="xs">
            <IconStar size={16} color={styleProps.statusColor} />
            <Tooltip label={subscription.plans.name} position="top" withArrow withinPortal>
              <Box style={{ maxWidth: 400, minWidth: 0 }}>
                <Text
                  className={classes.planName}
                  weight={600}
                  size="lg"
                  color={styleProps.statusColor}
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "block",
                  }}
                >
                  {subscription.plans.name}
                </Text>
              </Box>
            </Tooltip>
          </Group>
        </Box>

        {isFlapjack && (
          <Group spacing={8}>
            {showCancelAction && (
              <Tooltip label="Cancel Subscription" position="top" withArrow transition="fade">
                <ActionIcon
                  size="lg"
                  className={classes.deleteButton}
                  radius="xl"
                  onClick={handleCancelClick}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Tooltip>
            )}

            {!hideEditButton && (
              <Tooltip
                label={customTooltip || "Edit Subscription"}
                position="top"
                withArrow
                transition="fade"
              >
                <ActionIcon
                  size="lg"
                  className={classes.actionButton}
                  radius="xl"
                  onClick={onEdit}
                  disabled={isEditButtonDisabled}
                >
                  {customIcon || <IconEdit size={18} />}
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        )}
      </Group>

      {!hideDescription && (
        <Box className={classes.section} mb="md">
          <ClampedTextWithTooltip>{subscription.plans.description}</ClampedTextWithTooltip>
        </Box>
      )}

      <Box className={classes.section} mb="md">
        <Box
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            minHeight: 32,
          }}
        >
          <Text className={classes.priceLabel} size="xs" style={{ fontWeight: 600 }}>
            {statusLabel}
          </Text>
          <Box className={classes.statusBadge}>{statusBadge}</Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Text className={classes.price}>
            {formatPrice(subscription.plans.price, subscription.plans.currency)}
          </Text>
          <sub style={{ fontSize: 12, color: theme.colors.gray[6] }}>/month</sub>
        </Box>
        {additionalSection}
      </Box>

      <Box className={cx(classes.section, classes.lastSection)}>
        <Group spacing={6} align="center">
          <IconClock size={16} color={styleProps.statusColor} />
          <Text size="sm" color="dimmed" weight={500}>
            {dateLabel}
          </Text>
        </Group>

        <Text size="sm" mt={1} color="dimmed">
          {formatDate(subscription.current_period_start)} –{" "}
          {formatDate(subscription.current_period_end)}
        </Text>

        {footerContent}
      </Box>
    </Paper>
  );
};
