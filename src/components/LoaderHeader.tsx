import { Button, Group, Text } from "@mantine/core";
import { RefreshCw } from "lucide-react";

interface LoaderHeaderProps {
  isLoadingReleases: boolean;
  onRefresh: () => void;
}

export default function LoaderHeader({
  isLoadingReleases,
  onRefresh,
}: LoaderHeaderProps) {
  return (
    <Group justify="space-between" align="center">
      <div>
        <Text fw={700} size="md">
          Loader and Bypass Setup
        </Text>
        <Text c="dimmed" size="xs">
          Install and manage the x64 ASI loader and signature bypasser required
          for Neverness to Everness pak mods.
        </Text>
      </div>
      <Button
        size="xs"
        variant="subtle"
        leftSection={<RefreshCw size={14} />}
        loading={isLoadingReleases}
        onClick={onRefresh}
      >
        Refresh
      </Button>
    </Group>
  );
}
