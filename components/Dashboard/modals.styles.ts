import { createStyles } from "@mantine/core";

export const useModalStyles = createStyles((theme) => ({
  container: {
    width: "100%",
  },
  inputWrapper: {
    marginBottom: theme.spacing.md,
  },
  phoneInputWrapper: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
    "& .PhoneInputInput": {
      height: "36px",
      padding: "0 12px",
      borderRadius: theme.radius.sm,
      border: `1px solid ${theme.colors.gray[4]}`,
      fontSize: theme.fontSizes.sm,
      width: "100%",
      "&:focus": {
        outline: "none",
        borderColor: theme.colors.orange[5],
        boxShadow: `0 0 0 2px ${theme.fn.rgba(theme.colors.orange[5], 0.2)}`,
      },
    },
    "& .PhoneInputCountry": {
      marginRight: theme.spacing.xs,
    },
  },
  title: {
    color: theme.colors.gray[8],
  },
  header: {
    display: "flex",
    alignItems: "center",
  },
  icon: {
    marginRight: theme.spacing.sm,
    backgroundColor: theme.fn.rgba(theme.colors.orange[5], 0.1),
    color: theme.colors.orange[5],
    padding: theme.spacing.xs,
    borderRadius: theme.radius.sm,
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    marginTop: theme.spacing.xs,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.red[6],
  },
  label: {
    fontWeight: 500,
    fontSize: theme.fontSizes.sm,
    marginBottom: theme.spacing.xs,
    color: theme.colors.gray[7],
  },
  infoContainer: {
    backgroundColor: theme.fn.rgba(theme.colors.blue[1], 0.3),
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.md,
    borderLeft: `3px solid ${theme.colors.blue[4]}`,
  },
  buttonContainer: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: theme.spacing.xl,
  },
}));
