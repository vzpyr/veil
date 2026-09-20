import { Badge, Box, Card, Group, Stack, Text } from "@mantine/core";
import { CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

interface LoaderCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  installed: boolean;
  children: ReactNode;
}

export default function LoaderCard({
  icon,
  title,
  description,
  installed,
  children,
}: LoaderCardProps) {
  return (
    <Card
      p="sm"
      style={{
        backgroundColor: "var(--color-bg-card)",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Group gap="xs">
            {icon}
            <Text fw={600} size="sm">
              {title}
            </Text>
          </Group>
          {installed ? (
            <Badge
              color="green"
              variant="light"
              size="sm"
              leftSection={<CheckCircle2 size={12} />}
            >
              Installed
            </Badge>
          ) : (
            <Badge color="gray" variant="light" size="sm">
              Not Installed
            </Badge>
          )}
        </Group>

        <Text c="dimmed" size="xs">
          {description}
        </Text>

        {children}
      </Stack>
    </Card>
  );
}

interface LoaderInfoRowsProps {
  rows: { label: string; value: string }[];
}

export function LoaderInfoRows({ rows }: LoaderInfoRowsProps) {
  return (
    <Box
      p="xs"
      style={{
        backgroundColor: "var(--color-bg-surface-2)",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      {rows.map((row, index) => (
        <Group
          key={row.label}
          justify="space-between"
          mt={index === 0 ? undefined : "var(--space-3xs)"}
        >
          <Text size="xs" c="dimmed">
            {row.label}
          </Text>
          <Text size="xs" fw={600}>
            {row.value}
          </Text>
        </Group>
      ))}
    </Box>
  );
}
