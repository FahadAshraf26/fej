// components/billing/subscription/InvoiceDetails.tsx
import React from "react";
import { Box, Divider, Badge, Anchor, Text } from "@mantine/core";
import { IconReceipt, IconExternalLink } from "@tabler/icons";
import { createStyles } from "@mantine/core";

const useStyles = createStyles((theme) => ({
  invoiceContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xl,
    padding: theme.spacing.md,
    backgroundColor: theme.fn.rgba(theme.colors.gray[0], 0.5),
    borderRadius: theme.radius.md,
    border: `1px solid ${theme.fn.rgba(theme.colors.gray[3], 0.5)}`,
  },
  invoiceHeader: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing.xs,
    color: theme.colors.gray[7],
    fontSize: theme.fontSizes.sm,
    fontWeight: 500,
  },
  invoiceLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: theme.spacing.xs,
    padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.white,
    color: theme.colors.blue[6],
    border: `1px solid ${theme.fn.rgba(theme.colors.blue[6], 0.2)}`,
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: theme.fn.rgba(theme.colors.blue[6], 0.05),
      textDecoration: "none",
      transform: "translateY(-1px)",
      borderColor: theme.colors.blue[6],
    },
  },
  invoiceIcon: {
    color: theme.colors.blue[6],
    transition: "transform 0.2s ease",
  },
  invoiceId: {
    fontFamily: theme.fontFamilyMonospace,
    fontSize: theme.fontSizes.sm,
    letterSpacing: "0.5px",
  },
  newTabBadge: {
    backgroundColor: theme.fn.rgba(theme.colors.gray[6], 0.1),
    color: theme.colors.gray[6],
    fontSize: theme.fontSizes.xs,
    padding: "2px 8px",
    borderRadius: theme.radius.xl,
  },
  divider: {
    width: "100%",
    margin: `${theme.spacing.xs}px 0`,
    borderTopColor: theme.fn.rgba(theme.colors.gray[3], 0.5),
  },
}));

interface InvoiceDetailsProps {
  invoiceData: {
    invoiceId: string;
    invoiceUrl: string;
  };
}

export function InvoiceDetails({ invoiceData }: InvoiceDetailsProps) {
  const { classes } = useStyles();

  return (
    <Box className={classes.invoiceContainer}>
      <div className={classes.invoiceHeader}>
        <IconReceipt size={18} />
        <Text>Invoice Details</Text>
      </div>
      <Divider className={classes.divider} />
      <Badge className={classes.newTabBadge} size="sm">
        Opens in new tab
      </Badge>
      <Anchor
        href={invoiceData.invoiceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={classes.invoiceLink}
      >
        <Text className={classes.invoiceId}>{invoiceData.invoiceId}</Text>
        <IconExternalLink size={16} className={classes.invoiceIcon} />
      </Anchor>
    </Box>
  );
}
