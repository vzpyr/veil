import type { MantineThemeComponents } from "@mantine/core";

export const overlays: MantineThemeComponents = {
  Alert: {
    defaultProps: {
      radius: "lg",
    },
    styles: {
      root: {
        borderRadius: "var(--radius-lg)",
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
        borderRadius: "var(--radius-pill)",
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
        borderRadius: "var(--radius-pill)",
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
        borderRadius: "var(--radius-pill)",
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
};
