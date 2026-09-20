import { createVarsResolver } from "@mantine/core";
import type { MantineThemeComponents } from "@mantine/core";

export const controls: MantineThemeComponents = {
  Button: {
    defaultProps: {
      radius: "pill",
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
      radius: "pill",
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
      radius: "pill",
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
  Avatar: {
    defaultProps: {
      radius: "pill",
    },
  },
  NavLink: {
    defaultProps: {
      radius: "pill",
    },
    styles: (_theme: any, props: any) => ({
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
    },
    vars: createVarsResolver(() => ({
      input: {
        "--input-placeholder-color": "var(--color-text-muted)",
        "--input-bd-focus": "var(--color-border-focus)",
      },
    })),
  },
  InputWrapper: {
    styles: {
      label: {
        marginBottom: "var(--space-xs)",
        color: "var(--color-text-secondary)",
        fontSize: "var(--font-size-xs)",
        fontWeight: 600,
      },
      description: {
        marginBottom: "var(--space-xs)",
        color: "var(--color-text-muted)",
        fontSize: "var(--font-size-2xs)",
      },
    },
  },
  TextInput: {
    defaultProps: {
      radius: "pill",
    },
  },
  Select: {
    defaultProps: {
      radius: "pill",
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
};
