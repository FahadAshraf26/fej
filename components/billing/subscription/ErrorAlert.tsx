// components/billing/subscription/ErrorAlert.tsx
import React from "react";
import { Box, Text, Button, Loader } from "@mantine/core";
import { IconAlertCircle, IconCreditCard } from "@tabler/icons";
import { createStyles } from "@mantine/core";

const useStyles = createStyles((theme) => ({
  errorContainer: {
    marginTop: theme.spacing.xl,
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  customAlertBox: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    borderColor: theme.colors.red[6],
    backgroundColor: theme.colors.red[0],
    marginBottom: theme.spacing.lg,
    width: "100%",
    maxWidth: "500px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  alertHeader: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing.xs,
    fontWeight: 600,
    color: theme.colors.red[7],
  },
  actionButtons: {
    display: "flex",
    gap: theme.spacing.md,
    justifyContent: "center",
    marginTop: theme.spacing.lg,
    flexWrap: "wrap",
  },
  errorButton: {
    background: theme.colors.red[6],
    "&:hover": {
      background: theme.colors.red[7],
    },
  },
}));

interface ErrorAlertProps {
  error: string;
  type: "payment-failed" | "invoice-loading";
  onRetry?: () => void;
  onUpdatePaymentMethod?: () => void;
  isUpdatingPayment?: boolean;
}

export function ErrorAlert({
  error,
  type,
  onRetry,
  onUpdatePaymentMethod,
  isUpdatingPayment,
}: ErrorAlertProps) {
  const { classes } = useStyles();

  const isPaymentFailed = type === "payment-failed";
  const isInvoiceLoading = type === "invoice-loading";

  return (
    <Box className={classes.errorContainer}>
      <Box className={classes.customAlertBox}>
        <div className={classes.alertHeader}>
          <IconAlertCircle size={16} />
          <Text size="md">{isPaymentFailed ? "Payment Error" : "Unable to load invoice"}</Text>
        </div>
        <Text size="sm" align="center">
          {isInvoiceLoading
            ? "Your payment was successful, but we couldn't load your invoice details."
            : ""}
          {error && ` ${error}`}
        </Text>
      </Box>

      <div className={classes.actionButtons}>
        {isPaymentFailed && onUpdatePaymentMethod && (
          <Button
            leftIcon={<IconCreditCard size={16} />}
            className={classes.errorButton}
            onClick={onUpdatePaymentMethod}
            loading={isUpdatingPayment}
          >
            Update Payment Method
          </Button>
        )}

        {isInvoiceLoading && onRetry && (
          <Button variant="outline" onClick={onRetry}>
            Try Again
          </Button>
        )}
      </div>
    </Box>
  );
}
