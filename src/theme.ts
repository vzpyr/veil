import { createTheme, MantineColorsTuple } from "@mantine/core";

const veilBlue: MantineColorsTuple = [
  "#eff6ff",
  "#dbeafe",
  "#bfdbfe",
  "#93c5fd",
  "#60a5fa",
  "#3b82f6",
  "#2563eb",
  "#1d4ed8",
  "#1e40af",
  "#1e3a8a",
];

const veilDark: MantineColorsTuple = [
  "#f1f5f9",
  "#cbd5e1",
  "#94a3b8",
  "#64748b",
  "#475569",
  "#334155",
  "#222830",
  "#191e24",
  "#12151a",
  "#0b0d10",
];

export const theme = createTheme({
  primaryColor: "blue",
  colors: {
    blue: veilBlue,
    dark: veilDark,
  },
  fontFamily: "var(--font-family-sans)",
  fontFamilyMonospace: "var(--font-family-mono)",
  defaultRadius: "sm",
  spacing: {
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
  },
  fontSizes: {
    xs: "var(--font-size-xs)",
    sm: "var(--font-size-sm)",
    md: "var(--font-size-md)",
    lg: "var(--font-size-lg)",
    xl: "var(--font-size-xl)",
  },
});
