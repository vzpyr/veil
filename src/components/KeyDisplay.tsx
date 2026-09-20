import { Group, Kbd, Text } from "@mantine/core";

function formatTokenLabel(token: string): string {
  const lower = token.toLowerCase();
  if (lower === "ctrl") return "Ctrl";
  if (lower === "alt") return "Alt";
  if (lower === "shift") return "Shift";
  if (lower === "no_modifiers") return "No Modifiers";
  if (lower.startsWith("numpad")) {
    const rest = lower.slice(6);
    return `Num ${rest}`;
  }
  if (lower === "add") return "+";
  if (lower === "subtract") return "-";
  if (lower === "multiply") return "*";
  if (lower === "divide") return "/";
  if (lower === "decimal") return ".";
  if (lower.startsWith("f") && /^\d+$/.test(lower.slice(1))) {
    return lower.toUpperCase();
  }
  if (token.length === 1) {
    return token.toUpperCase();
  }
  return token.charAt(0).toUpperCase() + token.slice(1);
}

export default function KeyDisplay({ keyStr }: { keyStr: string }) {
  const tokens = keyStr.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return (
      <Text size="xs" c="dimmed">
        None
      </Text>
    );
  }

  return (
    <Group gap="2xs" wrap="nowrap">
      {tokens.map((token, i) => (
        <Group key={i} gap="2xs" wrap="nowrap">
          {i > 0 &&
            token.toLowerCase() !== "no_modifiers" &&
            tokens[i - 1].toLowerCase() !== "no_modifiers" && (
              <Text size="xs" c="dimmed">
                +
              </Text>
            )}
          <Kbd size="xs">{formatTokenLabel(token)}</Kbd>
        </Group>
      ))}
    </Group>
  );
}
