import React from "react";
import {
  createStyles,
  Title,
  Text,
  Container,
  Paper,
  Center,
} from "@mantine/core";
import { IconClockCancel } from "@tabler/icons";

const useStyles = createStyles((theme) => ({
  root: {
    paddingTop: 80,
    paddingBottom: 80,
  },

  paper: {
    borderRadius: theme.radius.md,
    padding: theme.spacing.xl * 2,
    backgroundColor:
      theme.colorScheme === "dark" ? theme.colors.dark[8] : theme.white,
  },

  title: {
    fontWeight: 900,
    fontSize: 34,
    marginBottom: theme.spacing.md,
    [theme.fn.smallerThan("sm")]: {
      fontSize: 28,
    },
  },

  description: {
    maxWidth: 600,
    margin: "auto",
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl * 1.5,
  },

  cancelIcon: {
    color: theme.colors.orange[6],
    fontSize: 100,
  },

  primaryButton: {
    background: theme.colors.orange[6],
    "&:hover": {
      background: theme.colors.orange[7],
    },
  },

  secondaryButton: {
    color: theme.colors.orange[6],
    borderColor: theme.colors.orange[6],
    "&:hover": {
      backgroundColor: theme.fn.rgba(theme.colors.orange[6], 0.05),
    },
  },
}));

export function StripeCancelPage() {
  const { classes } = useStyles();

  return (
    <Container className={classes.root}>
      <Paper shadow="md" className={classes.paper}>
        <Center mb={30}>
          <IconClockCancel
            size={100}
            style={{ color: "#f76707" }}
            stroke={1.5}
          />
        </Center>

        <Title align="center" className={classes.title}>
          Checkout Interrupted
        </Title>

        <Text
          color="dimmed"
          size="lg"
          align="center"
          className={classes.description}
        >
          You&apos;ve left the checkout process. No payment has been processed.
          You can return to the checkout whenever you&apos;re ready to complete
          your subscription.
        </Text>

        <Text color="dimmed" size="md" align="center" mt="xl">
          If you have any questions or need assistance, please contact our team
          at:
          <Text component="span" weight={600} color="orange.6" ml={4}>
            howdy@flapjack.co
          </Text>
        </Text>
      </Paper>
    </Container>
  );
}

export default StripeCancelPage;
