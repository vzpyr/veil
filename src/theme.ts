import { createTheme, MantineColorsTuple } from "@mantine/core";

const veilDark: MantineColorsTuple = [
  "#f3f5f8",
  "#d2d6de",
  "#9da4b2",
  "#6b7382",
  "#4b5362",
  "#2f3542",
  "#222731",
  "#1b1f26",
  "#14171d",
  "#0e1116",
];

const veilGray: MantineColorsTuple = [
  "#fafbfc",
  "#f3f5f8",
  "#e6e9ee",
  "#d2d6de",
  "#9da4b2",
  "#6b7382",
  "#4b5362",
  "#333947",
  "#1b1f26",
  "#0e1116",
];

export const theme = createTheme({
  primaryColor: "gray",
  colors: {
    dark: veilDark,
    gray: veilGray,
  },
  breakpoints: {
    xs: "36em",
    sm: "48em",
    md: "62em",
    lg: "75em",
    xl: "88em",
    xxl: "110em",
  },
  fontFamily: "var(--font-family-sans)",
  fontFamilyMonospace: "var(--font-family-mono)",
  defaultRadius: "md",
  spacing: {
    "3xs": "var(--space-3xs)",
    "2xs": "var(--space-2xs)",
    xs: "var(--space-xs)",
    sm: "var(--space-sm)",
    md: "var(--space-md)",
    lg: "var(--space-lg)",
    xl: "var(--space-xl)",
  },
  radius: {
    xs: "var(--radius-xs)",
    sm: "var(--radius-sm)",
    md: "var(--radius-md)",
    lg: "var(--radius-lg)",
    xl: "var(--radius-xl)",
    pill: "var(--radius-pill)",
  },
  fontSizes: {
    "3xs": "var(--font-size-3xs)",
    "2xs": "var(--font-size-2xs)",
    xs: "var(--font-size-xs)",
    sm: "var(--font-size-sm)",
    md: "var(--font-size-md)",
    lg: "var(--font-size-lg)",
    xl: "var(--font-size-xl)",
  },
  components: {
    Button: {
      defaultProps: {
        radius: "xl",
      },
    },
    Badge: {
      defaultProps: {
        radius: "xl",
      },
    },
    SegmentedControl: {
      defaultProps: {
        radius: "xl",
        withItemsBorders: false,
      },
    },
    TextInput: {
      defaultProps: {
        radius: "md",
      },
    },
    Select: {
      defaultProps: {
        radius: "md",
      },
    },
    Card: {
      defaultProps: {
        radius: "lg",
      },
    },
    Modal: {
      defaultProps: {
        radius: "lg",
      },
    },
    Drawer: {
      defaultProps: {
        radius: "lg",
      },
    },
    Paper: {
      defaultProps: {
        radius: "md",
      },
    },
    ActionIcon: {
      defaultProps: {
        radius: "xl",
      },
    },
    Tabs: {
      defaultProps: {
        radius: "xl",
      },
    },
    Switch: {
      defaultProps: {
        radius: "xl",
      },
    },
  },
});
