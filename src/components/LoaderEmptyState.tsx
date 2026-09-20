import { Box, Button, Card, Stack, Text } from "@mantine/core";
import { AlertTriangle, FolderCog } from "lucide-react";

interface LoaderEmptyStateProps {
  onNavigateToSettings: () => void;
}

export default function LoaderEmptyState({
  onNavigateToSettings,
}: LoaderEmptyStateProps) {
  return (
    <Box p="sm" maw="var(--max-width-settings)" mx="auto">
      <Card p="md" style={{ backgroundColor: "var(--color-bg-surface-1)" }}>
        <Stack gap="sm" align="center">
          <AlertTriangle size={36} color="var(--color-status-warning)" />
          <Text fw={700} size="md">
            Game directory not configured
          </Text>
          <Text c="dimmed" size="xs" ta="center">
            Select your Neverness to Everness base game directory in Settings
            before managing loader binaries.
          </Text>
          <Button
            size="xs"
            variant="default"
            leftSection={<FolderCog size={14} />}
            onClick={onNavigateToSettings}
          >
            Open Settings
          </Button>
        </Stack>
      </Card>
    </Box>
  );
}
