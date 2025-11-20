// components/billing/subscription/PaymentStatusIcon.tsx
import React from "react";
import { Center } from "@mantine/core";
import { IconCircleCheck, IconX } from "@tabler/icons";
import { createStyles } from "@mantine/core";

const useStyles = createStyles((theme) => ({
  successIcon: {
    color: theme.colors.green[6],
  },
  errorIcon: {
    color: theme.colors.red[6],
  },
}));

interface PaymentStatusIconProps {
  status: "success" | "failed";
}

export function PaymentStatusIcon({ status }: PaymentStatusIconProps) {
  const { classes } = useStyles();

  return (
    <Center mb={30}>
      {status === "success" ? (
        <IconCircleCheck size={50} className={classes.successIcon} stroke={1.5} />
      ) : (
        ""
      )}
    </Center>
  );
}
