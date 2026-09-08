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

const veilWarning: MantineColorsTuple = [
  "#fffbeb",
  "#fef3c7",
  "#fde68a",
  "#fcd34d",
  "#fbbf24",
  "#f59e0b",
  "#d97706",
  "#b45309",
  "#78350f",
  "#451a03",
];

const veilError: MantineColorsTuple = [
  "#fef2f2",
  "#fee2e2",
  "#fecaca",
  "#fca5a5",
  "#f87171",
  "#ef4444",
  "#dc2626",
  "#b91c1c",
  "#7f1d1d",
  "#450a0a",
];

const veilSuccess: MantineColorsTuple = [
  "#ecfdf5",
  "#d1fae5",
  "#a7f3d0",
  "#6ee7b7",
  "#34d399",
  "#10b981",
  "#059669",
  "#047857",
  "#064e3b",
  "#022c22",
];

const veilInfo: MantineColorsTuple = [
  "#f9fafb",
  "#f3f4f6",
  "#e5e7eb",
  "#d1d5db",
  "#9ca3af",
  "#6b7280",
  "#4b5563",
  "#374151",
  "#1f2937",
  "#111827",
];

export const theme = createTheme({
  primaryColor: "gray",
  primaryShade: { light: 6, dark: 2 },
  colors: {
    dark: veilDark,
    gray: veilGray,
    orange: veilWarning,
    yellow: veilWarning,
    red: veilError,
    green: veilSuccess,
    teal: veilSuccess,
    blue: veilInfo,
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
    "2xl": "var(--space-2xl)",
    "3xl": "var(--space-3xl)",
  },
  radius: {
    xs: "var(--radius-xs)",
    sm: "var(--radius-sm)",
    md: "var(--radius-md)",
    lg: "var(--radius-lg)",
    xl: "var(--radius-xl)",
    "2xl": "var(--radius-2xl)",
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
    "2xl": "var(--font-size-2xl)",
    "3xl": "var(--font-size-3xl)",
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
        radius: "xl",
      },
    },
    Select: {
      defaultProps: {
        radius: "xl",
      },
    },
    Card: {
      defaultProps: {
        radius: "lg",
        withBorder: true,
      },
      styles: {
        root: {
          backgroundColor: "var(--color-bg-card)",
          borderColor: "var(--color-border-subtle)",
          transition: "var(--transition-fast)",
        },
      },
    },
    Paper: {
      defaultProps: {
        radius: "md",
        withBorder: true,
      },
      styles: {
        root: {
          backgroundColor: "var(--color-bg-surface-2)",
          borderColor: "var(--color-border-subtle)",
        },
      },
    },
    Modal: {
      defaultProps: {
        radius: "lg",
      },
      styles: {
        content: {
          backgroundColor: "var(--color-bg-surface-2)",
          border: "1px solid var(--color-border-subtle)",
        },
        header: {
          backgroundColor: "var(--color-bg-surface-2)",
        },
      },
    },
    Drawer: {
      defaultProps: {
        radius: "lg",
      },
      styles: {
        content: {
          backgroundColor: "var(--color-bg-surface-2)",
          borderLeft: "1px solid var(--color-border-subtle)",
        },
        header: {
          backgroundColor: "var(--color-bg-surface-2)",
        },
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
    Menu: {
      defaultProps: {
        radius: "lg",
        shadow: "md",
      },
    },
    Alert: {
      defaultProps: {
        radius: "md",
      },
    },
    Tooltip: {
      defaultProps: {
        radius: "md",
      },
    },
    Notification: {
      defaultProps: {
        radius: "lg",
        withBorder: true,
      },
    },
    Progress: {
      defaultProps: {
        radius: "xl",
      },
    },
    Checkbox: {
      defaultProps: {
        radius: "xs",
      },
    },
    LoadingOverlay: {
      defaultProps: {
        overlayProps: {
          backgroundOpacity: 0.75,
          color: "var(--color-bg-base)",
          blur: 1,
        },
      },
    },
  },
});
