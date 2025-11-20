// components/billing/subscription/PaymentStatusMessage.tsx
import { Title, Text } from "@mantine/core";
import { createStyles } from "@mantine/core";

const useStyles = createStyles((theme) => ({
  successTitle: {
    fontWeight: 900,
    fontSize: 34,
    marginBottom: theme.spacing.md,
    color: theme.colors.orange[6],
    [theme.fn.smallerThan("sm")]: {
      fontSize: 28,
    },
  },
  errorTitle: {
    fontWeight: 900,
    fontSize: 34,
    marginBottom: theme.spacing.md,
    color: theme.colors.red[6],
    [theme.fn.smallerThan("sm")]: {
      fontSize: 28,
    },
  },
  description: {
    maxWidth: 600,
    margin: "auto",
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
}));

interface PaymentStatusMessageProps {
  status: "success" | "failed";
}

export function PaymentStatusMessage({ status }: PaymentStatusMessageProps) {
  const { classes } = useStyles();

  if (status === "failed") {
    return (
      <>
        <Title align="center" className={classes.errorTitle}>
          Payment Failed
        </Title>
        <Text color="dimmed" size="lg" align="center" className={classes.description}>
          We were unable to process your payment. Please check your payment method and try again.
        </Text>
      </>
    );
  }

  return (
    <>
      <Title align="center" className={classes.successTitle}>
        Payment Successful!
      </Title>
      <Text color="dimmed" size="lg" align="center" className={classes.description}>
        Thank you for subscribing to Flapjack! Your payment has been processed successfully.
        We&apos;ve sent a confirmation email with your subscription details.
      </Text>
    </>
  );
}
