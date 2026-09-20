import { Button, Center, Stack, Text } from "@mantine/core";
import { TriangleAlert } from "lucide-react";

interface GbModErrorStateProps {
  message: string;
  onRetry: () => void;
}

export default function GbModErrorState({
  message,
  onRetry,
}: GbModErrorStateProps) {
  return (
    <Center h="var(--height-empty-state)">
      <Stack align="center" gap="sm" className="animate-fade-in-up">
        <TriangleAlert size={44} color="var(--color-status-error)" />
        <Text fw={600} size="md">
          Failed to Load Mod
        </Text>
        <Text c="dimmed" size="xs" ta="center">
          {message}
        </Text>
        <Button size="xs" variant="default" onClick={onRetry}>
          Retry
        </Button>
      </Stack>
    </Center>
  );
}
