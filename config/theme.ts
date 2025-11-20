import { MantineTheme, DEFAULT_THEME } from "@mantine/core";

const theme: MantineTheme = {
  ...DEFAULT_THEME,
  primaryColor: "orange",
  focusRingStyles: {
    resetStyles: (theme) => ({
      outline: `none`,
    }),
    styles: (theme) => ({ outline: `1px solid ${theme.colors.orange[5]}` }),
    inputStyles: (theme) => ({
      outline: `1px solid ${theme.colors.orange[5]}`,
    }),
  },
};

export default theme;
