// components/billing/subscription/LoadingSpinner.tsx
import { Box, Loader } from "@mantine/core";
import { createStyles } from "@mantine/core";

const useStyles = createStyles((theme) => ({
  fullPageLoader: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.white,
    zIndex: 1000,
  },
  loadingContainer: {
    textAlign: "center",
  },
}));

export function LoadingSpinner() {
  const { classes } = useStyles();

  return (
    <div className={classes.fullPageLoader}>
      <Box className={classes.loadingContainer}>
        <Loader size="xl" mb="md" variant="dots" />
      </Box>
    </div>
  );
}
