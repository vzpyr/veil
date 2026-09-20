import { defaultVariantColorsResolver } from "@mantine/core";
import type { MantineColorsTuple, VariantColorsResolver } from "@mantine/core";

export const veilDark: MantineColorsTuple = [
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

export const veilGray: MantineColorsTuple = [
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

export const veilWarning: MantineColorsTuple = [
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

export const veilError: MantineColorsTuple = [
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

export const veilSuccess: MantineColorsTuple = [
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

export const veilInfo: MantineColorsTuple = [
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

export const variantColorResolver: VariantColorsResolver = ({
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
