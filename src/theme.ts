import {
  createTheme,
  defaultVariantColorsResolver,
  MantineColorsTuple,
  createVarsResolver,
} from "@mantine/core";
import type { VariantColorsResolver } from "@mantine/core";

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

const variantColorResolver: VariantColorsResolver = ({
  variant,
  color,
  ...input
}) => {
  if (variant === "default") {
    return {
      background: "var(--color-btn-default-bg)",
      hover: "var(--color-btn-default-hover)",
      color: "var(--color-btn-default-text)",
      border: "1px solid var(--color-btn-default-border)",
    };
  }

  if (color === "orange" && variant === "light") {
    return {
      background: "var(--color-status-warning-surface)",
      hover: "var(--color-status-warning-surface)",
      color: "var(--color-status-warning)",
      border: "1px solid var(--color-status-warning-border)",
    };
  }

  if (color === "orange" && variant === "filled") {
    return {
      background: "var(--color-status-warning)",
      hover: "var(--color-status-warning-strong)",
      color: "var(--color-status-warning-contrast)",
      border: "1px solid transparent",
    };
  }

  if (color === "orange" && variant === "outline") {
    return {
      background: "transparent",
      hover: "transparent",
      color: "var(--color-status-warning)",
      border: "1px solid var(--color-status-warning-border)",
    };
  }

  if (color === "red" && variant === "light") {
    return {
      background: "var(--color-status-error-surface)",
      hover: "var(--color-status-error-surface)",
      color: "var(--color-status-error)",
      border: "1px solid var(--color-status-error-border)",
    };
  }

  if (color === "red" && variant === "filled") {
    return {
      background: "var(--color-btn-danger-bg)",
      hover: "var(--color-btn-danger-hover)",
      color: "var(--color-btn-danger-text)",
      border: "1px solid var(--color-btn-danger-border)",
    };
  }

  if (color === "green" && variant === "light") {
    return {
      background: "var(--color-status-success-surface)",
      hover: "var(--color-status-success-surface)",
      color: "var(--color-status-success)",
      border: "1px solid var(--color-status-success-border)",
    };
  }

  if (color === "green" && variant === "filled") {
    return {
      background: "var(--color-status-success)",
      hover: "var(--color-status-success-strong)",
      color: "var(--color-status-success-contrast)",
      border: "1px solid transparent",
    };
  }

  if (color === "yellow" && variant === "light") {
    return {
      background: "var(--color-status-warning-surface)",
      hover: "var(--color-status-warning-surface)",
      color: "var(--color-status-warning)",
      border: "1px solid var(--color-status-warning-border)",
    };
  }

  if (color === "dark" && variant === "filled") {
    return {
      background: "var(--color-bg-surface-2)",
      hover: "var(--color-bg-card-hover)",
      color: "var(--color-text-primary)",
      border: "1px solid var(--color-border-strong)",
    };
  }

  if (color === "gray" && variant === "subtle") {
    return {
      background: "transparent",
      hover: "var(--color-surface-hover)",
      color: "var(--color-text-secondary)",
      border: "1px solid transparent",
    };
  }

  if (color === "gray" && variant === "light") {
    return {
      background: "var(--color-bg-surface-3)",
      hover: "var(--color-surface-hover)",
      color: "var(--color-text-secondary)",
      border: "1px solid transparent",
    };
  }

  if (color === "gray" && variant === "outline") {
    return {
      background: "transparent",
      hover: "transparent",
      color: "var(--color-text-secondary)",
      border: "1px solid var(--color-btn-default-border)",
    };
  }

  if (variant === "filled" && (!color || color === "gray")) {
    return {
      background: "var(--color-btn-primary-bg)",
      hover: "var(--color-btn-primary-hover)",
      color: "var(--color-btn-primary-text)",
      border: "1px solid var(--color-btn-primary-border)",
    };
  }

  return defaultVariantColorsResolver({ variant, color, ...input });
};

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
  variantColorResolver,
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
  cursorType: "pointer",
  shadows: {
    xs: "var(--shadow-xs)",
    sm: "var(--shadow-sm)",
    md: "var(--shadow-md)",
    lg: "var(--shadow-lg)",
    xl: "var(--shadow-lg)",
  },
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
      styles: {
        root: {
          fontFamily: "var(--font-family-sans)",
          fontWeight: 500,
        },
      },
    },
    ActionIcon: {
      defaultProps: {
        radius: "xl",
      },
      styles: {
        root: {
          overflow: "visible",
        },
      },
      vars: createVarsResolver(() => ({
        root: {
          "--ai-radius": "var(--radius-pill)",
        },
      })),
    },
    Badge: {
      defaultProps: {
        radius: "xl",
      },
      styles: {
        root: {
          fontFamily: "var(--font-family-sans)",
          fontWeight: 600,
        },
        label: {
          textTransform: "none",
          letterSpacing: "0.01em",
        },
      },
    },
    NavLink: {
      defaultProps: {
        radius: "xl",
      },
      styles: (_theme, props) => ({
        root: {
          borderRadius: "var(--radius-pill)",
          paddingTop: "var(--space-2xs)",
          paddingBottom: "var(--space-2xs)",
          color: props.active
            ? "var(--color-text-primary)"
            : "var(--color-text-secondary)",
          backgroundColor: props.active
            ? "var(--color-bg-surface-3)"
            : "transparent",
        },
        label: {
          fontSize: "var(--font-size-xs)",
          fontWeight: props.active ? 600 : 500,
        },
        leftSection: props.active
          ? { color: "var(--color-accent-primary)" }
          : undefined,
      }),
    },
    Input: {
      styles: {
        input: {
          backgroundColor: "var(--color-bg-surface-2)",
          border: "1px solid var(--color-border-subtle)",
          color: "var(--color-text-primary)",
          fontFamily: "var(--font-family-sans)",
        },
        label: {
          marginBottom: "var(--space-3xs)",
        },
      },
      vars: createVarsResolver(() => ({
        input: {
          "--input-placeholder-color": "var(--color-text-muted)",
          "--input-bd-focus": "var(--color-border-focus)",
        },
      })),
    },
    TextInput: {
      defaultProps: {
        radius: "xl",
      },
    },
    Select: {
      defaultProps: {
        radius: "xl",
        comboboxProps: {
          shadow: "md",
          transitionProps: { transition: "pop-top-left", duration: 150 },
        },
      },
    },
    Combobox: {
      defaultProps: {
        radius: "lg",
        shadow: "md",
        transitionProps: { transition: "pop-top-left", duration: 150 },
      },
      styles: {
        dropdown: {
          backgroundColor: "var(--color-bg-surface-2)",
          border: "1px solid var(--color-border-strong)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-2xs)",
          boxShadow: "var(--shadow-md)",
        },
        option: {
          fontSize: "var(--font-size-xs)",
          borderRadius: "var(--radius-md)",
        },
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
          transition:
            "background-color var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast)",
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
    Menu: {
      defaultProps: {
        radius: "lg",
        shadow: "md",
        transitionProps: { transition: "pop-top-right", duration: 150 },
      },
      styles: {
        dropdown: {
          backgroundColor: "var(--color-bg-surface-2)",
          border: "1px solid var(--color-border-strong)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-2xs)",
          boxShadow: "var(--shadow-md)",
        },
        item: {
          borderRadius: "var(--radius-md)",
          fontSize: "var(--font-size-xs)",
          fontWeight: 500,
          lineHeight: "var(--line-height-normal)",
          padding: "var(--space-xs) var(--space-sm)",
        },
      },
      vars: createVarsResolver(() => ({
        dropdown: {
          "--menu-item-hover": "var(--color-bg-surface-3)",
          "--menu-item-color": "var(--color-text-secondary)",
        },
      })),
    },
    Tabs: {
      defaultProps: {
        radius: "xl",
      },
      vars: createVarsResolver(() => ({
        root: {
          "--tabs-color": "var(--color-accent-primary)",
          "--tabs-text-color": "var(--color-text-inverse)",
          "--tab-bg": "var(--color-bg-surface-2)",
          "--tab-color": "var(--color-text-secondary)",
          "--tab-hover-color": "var(--color-bg-surface-3)",
        },
      })),
      styles: {
        list: {
          gap: "var(--space-xs)",
          borderBottom: "none",
        },
        tab: {
          border: "1px solid var(--color-border-subtle)",
          fontSize: "var(--font-size-xs)",
          fontWeight: 500,
          padding: "var(--space-xs) var(--space-md)",
          transition:
            "background-color var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast)",
        },
      },
    },
    SegmentedControl: {
      defaultProps: {
        radius: "xl",
        withItemsBorders: false,
      },
      styles: {
        root: {
          backgroundColor: "var(--color-bg-surface-2)",
          border: "1px solid var(--color-border-subtle)",
          padding: "var(--space-3xs)",
        },
        label: {
          fontFamily: "var(--font-family-sans)",
          fontSize: "var(--font-size-xs)",
          fontWeight: 600,
        },
      },
      vars: createVarsResolver(() => ({
        root: {
          "--sc-color": "var(--color-accent-primary)",
          "--sc-label-color": "var(--color-text-inverse)",
          "--sc-radius": "var(--radius-pill)",
        },
      })),
    },
    Switch: {
      defaultProps: {
        radius: "xl",
      },
      styles: {
        track: {
          cursor: "pointer",
        },
      },
      vars: createVarsResolver(() => ({
        root: {
          "--switch-color": "var(--color-accent-primary)",
          "--switch-bg": "var(--color-bg-surface-3)",
          "--switch-bd": "var(--color-border-strong)",
        },
      })),
    },
    Checkbox: {
      defaultProps: {
        radius: "xs",
      },
      styles: {
        input: {
          backgroundColor: "var(--color-bg-surface-3)",
          borderColor: "var(--color-border-strong)",
          cursor: "pointer",
        },
        label: {
          color: "var(--color-text-primary)",
          fontFamily: "var(--font-family-sans)",
          fontSize: "var(--font-size-xs)",
          cursor: "pointer",
        },
      },
    },
    Kbd: {
      styles: {
        root: {
          backgroundColor: "var(--color-bg-surface-3)",
          border: "1px solid var(--color-border-strong)",
          borderBottom: "2px solid var(--color-border-strong)",
          color: "var(--color-text-primary)",
          borderRadius: "var(--radius-sm)",
          fontFamily: "var(--font-family-mono)",
          fontWeight: 600,
        },
      },
    },
    Progress: {
      defaultProps: {
        radius: "xl",
      },
      styles: {
        root: {
          backgroundColor: "var(--color-bg-surface-3)",
          borderRadius: "var(--radius-pill)",
        },
        section: {
          borderRadius: "var(--radius-pill)",
        },
      },
      vars: createVarsResolver((_theme, props: { color?: string }) => ({
        section: {
          "--progress-section-color":
            props.color === "gray" ? "var(--color-accent-primary)" : undefined,
        },
      })),
    },
    Tooltip: {
      defaultProps: {
        radius: "md",
        transitionProps: { transition: "fade", duration: 100 },
      },
      styles: {
        tooltip: {
          backgroundColor: "var(--color-bg-surface-3)",
          border: "1px solid var(--color-border-strong)",
          color: "var(--color-text-primary)",
          borderRadius: "var(--radius-md)",
          fontSize: "var(--font-size-xs)",
          fontFamily: "var(--font-family-sans)",
          fontWeight: 500,
          boxShadow: "var(--shadow-md)",
          padding: "var(--space-2xs) var(--space-xs)",
        },
      },
      vars: createVarsResolver(() => ({
        tooltip: {
          "--tooltip-bg": "var(--color-bg-surface-3)",
          "--tooltip-color": "var(--color-text-primary)",
        },
      })),
    },
    Alert: {
      defaultProps: {
        radius: "md",
      },
      styles: {
        root: {
          borderRadius: "var(--radius-md)",
          fontFamily: "var(--font-family-sans)",
        },
        title: {
          color: "var(--color-text-primary)",
          fontWeight: 600,
          fontSize: "var(--font-size-xs)",
        },
        message: {
          color: "var(--color-text-secondary)",
          fontSize: "var(--font-size-xs)",
          lineHeight: "var(--line-height-normal)",
        },
      },
    },
    Notification: {
      defaultProps: {
        radius: "lg",
        withBorder: true,
      },
      styles: {
        root: {
          backgroundColor: "var(--color-bg-surface-2)",
          border: "1px solid var(--color-border-strong)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          padding: "var(--space-sm) var(--space-md)",
          fontFamily: "var(--font-family-sans)",
        },
        title: {
          color: "var(--color-text-primary)",
          fontFamily: "var(--font-family-sans)",
          fontWeight: 600,
          fontSize: "var(--font-size-sm)",
        },
        description: {
          color: "var(--color-text-secondary)",
          fontFamily: "var(--font-family-sans)",
          fontSize: "var(--font-size-xs)",
          lineHeight: "var(--line-height-normal)",
        },
        closeButton: {
          color: "var(--color-text-muted)",
          borderRadius: "var(--radius-xl)",
        },
      },
    },
    Drawer: {
      defaultProps: {
        position: "right",
        radius: "lg",
      },
      styles: {
        content: {
          backgroundColor: "var(--color-bg-surface-2)",
          borderLeft: "1px solid var(--color-border-subtle)",
        },
        header: {
          backgroundColor: "var(--color-bg-surface-2)",
          borderBottom: "1px solid var(--color-border-subtle)",
          padding: "var(--space-sm) var(--space-md)",
        },
        body: {
          backgroundColor: "var(--color-bg-surface-2)",
          padding: "var(--space-md)",
        },
        close: {
          color: "var(--color-text-muted)",
          borderRadius: "var(--radius-xl)",
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
          borderBottom: "1px solid var(--color-border-subtle)",
          padding: "var(--space-sm) var(--space-md)",
        },
        body: {
          backgroundColor: "var(--color-bg-surface-2)",
          padding: "var(--space-md)",
        },
        close: {
          color: "var(--color-text-muted)",
          borderRadius: "var(--radius-xl)",
        },
      },
    },
    ScrollArea: {
      styles: {
        thumb: {
          backgroundColor: "var(--color-border-strong)",
          borderRadius: "var(--radius-pill)",
        },
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
    Carousel: {
      styles: {
        control: {
          backgroundColor: "var(--color-bg-overlay)",
          border: "1px solid var(--color-border-strong)",
          color: "var(--color-text-primary)",
          borderRadius: "var(--radius-pill)",
          boxShadow: "var(--shadow-md)",
        },
        indicator: {
          backgroundColor: "var(--color-border-strong)",
          borderRadius: "var(--radius-pill)",
        },
      },
    },
  },
});
