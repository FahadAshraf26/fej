// components/billing/subscription/PaymentSuccessLayout.tsx
import React from "react";
import { Container, Paper } from "@mantine/core";
import { createStyles } from "@mantine/core";

const useStyles = createStyles((theme) => ({
  root: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.xl,
  },
  paper: {
    borderRadius: theme.radius.md,
    padding: theme.spacing.xl * 2,
    backgroundColor: theme.colorScheme === "dark" ? theme.colors.dark[8] : theme.white,
    width: "100%",
    maxWidth: 600,
  },
}));

interface PaymentSuccessLayoutProps {
  children: React.ReactNode;
}

export function PaymentSuccessLayout({ children }: PaymentSuccessLayoutProps) {
  const { classes } = useStyles();

  return (
    <Container className={classes.root}>
      <Paper shadow="md" className={classes.paper}>
        {children}
      </Paper>
    </Container>
  );
}
