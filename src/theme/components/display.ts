import { createVarsResolver } from "@mantine/core";
import type { MantineThemeComponents } from "@mantine/core";

export const display: MantineThemeComponents = {
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
      radius: "lg",
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
      radius: "pill",
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
      radius: "pill",
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
      radius: "pill",
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
      radius: "pill",
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
};
