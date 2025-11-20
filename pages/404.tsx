import React from "react";
import {
  Container,
  Title,
  Text,
  Button,
  createStyles,
  Group,
} from "@mantine/core";
import { IconDog } from "@tabler/icons";

const useStyles = createStyles((theme) => ({
  root: {
    paddingTop: 80,
    paddingBottom: 80,
  },

  icon: {
    color: theme.colors.red[7],
    width: 160,
    height: 160,
    marginBottom: theme.spacing.lg,
  },

  title: {
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,
    textAlign: "center",
    fontWeight: 900,
    fontSize: 38,
    marginBottom: theme.spacing.md,

    [theme.fn.smallerThan("sm")]: {
      fontSize: 32,
    },
  },

  description: {
    maxWidth: 540,
    margin: "auto",
    marginBottom: theme.spacing.xl * 1.5,
  },
}));

const _404 = ({
  message = "Oops! Looks like our playful pup thought this page was a snack",
  subtitle = "While we train our four-legged friend, why not head back home?",
}) => {
  const { classes } = useStyles();

  return (
    <Container className={classes.root}>
      <Group position="center">
        <IconDog stroke={1.5} className={classes.icon} color="#bf360a" />
      </Group>

      <Title className={classes.title}>404</Title>
      <Text
        color="dimmed"
        size="lg"
        align="center"
        className={classes.description}
      >
        {message}
      </Text>
      <Text color="dimmed" size="md" align="center" mb="xl">
        {subtitle}
      </Text>

      <Group position="center">
        <Button
          variant="subtle"
          size="md"
          onClick={() => (window.location.href = "/")}
        >
          Take me back home
        </Button>
      </Group>
    </Container>
  );
};

export default _404;
