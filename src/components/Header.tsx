import {
  ActionIcon,
  Badge,
  Button,
  Group,
  SegmentedControl,
  Select,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconDownload,
  IconFolder,
  IconRefresh,
  IconSettings,
  IconSparkles,
  IconWorld,
} from "@tabler/icons-react";
import { ConflictGroup, GameDefinition } from "../types";

interface HeaderProps {
  games: GameDefinition[];
  activeGameId: string;
  onSelectGame: (gameId: string) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  conflicts: ConflictGroup[];
  onOpenConflicts: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  activeDownloadCount: number;
  onOpenDownloadQueue: () => void;
  onCheckUpdates?: () => void;
  isCheckingUpdates?: boolean;
  updatesCount?: number;
}

export default function Header({
  games,
  activeGameId,
  onSelectGame,
  activeTab,
  onSelectTab,
  conflicts,
  onOpenConflicts,
  onRefresh,
  isRefreshing,
  activeDownloadCount,
  onOpenDownloadQueue,
  onCheckUpdates,
  isCheckingUpdates,
  updatesCount = 0,
}: HeaderProps) {
  const gameSelectData = games.map((g) => ({
    value: g.id,
    label: `${g.short_name} (${g.name})`,
  }));

  const tabData = [
    {
      value: "installed",
      label: (
        <Group gap="xs">
          <IconFolder size={16} />
          <Text size="sm">Installed</Text>
        </Group>
      ),
    },
    {
      value: "browser",
      label: (
        <Group gap="xs">
          <IconWorld size={16} />
          <Text size="sm">GameBanana</Text>
        </Group>
      ),
    },
    {
      value: "settings",
      label: (
        <Group gap="xs">
          <IconSettings size={16} />
          <Text size="sm">Settings</Text>
        </Group>
      ),
    },
  ];

  return (
    <Group
      h={60}
      px="md"
      justify="space-between"
      style={{
        backgroundColor: "var(--color-bg-surface-1)",
        borderBottom: "1px solid var(--color-border-subtle)",
      }}
    >
      <Group gap="md">
        <Text
          fw={800}
          size="lg"
          style={{
            letterSpacing: "0.05em",
            color: "var(--color-accent-text)",
          }}
        >
          veil
        </Text>

        <Select
          size="xs"
          w={220}
          data={gameSelectData}
          value={activeGameId}
          onChange={(val) => val && onSelectGame(val)}
          allowDeselect={false}
          comboboxProps={{
            shadow: "md",
            transitionProps: { transition: "pop-top-left" },
          }}
        />
      </Group>

      <SegmentedControl
        size="xs"
        value={activeTab}
        onChange={onSelectTab}
        data={tabData}
      />

      <Group gap="xs">
        {conflicts.length > 0 && (
          <Tooltip label={`${conflicts.length} mod conflicts detected`}>
            <Button
              size="xs"
              color="orange"
              variant="light"
              leftSection={<IconAlertTriangle size={14} />}
              onClick={onOpenConflicts}
            >
              Conflicts
              <Badge size="xs" color="orange" ml="xs" variant="filled">
                {conflicts.length}
              </Badge>
            </Button>
          </Tooltip>
        )}

        <Tooltip label="Download Queue">
          <ActionIcon
            variant={activeDownloadCount > 0 ? "light" : "default"}
            color={activeDownloadCount > 0 ? "blue" : undefined}
            size="md"
            onClick={onOpenDownloadQueue}
            style={{ position: "relative" }}
          >
            <IconDownload size={16} />
            {activeDownloadCount > 0 && (
              <Badge
                size="xs"
                circle
                color="blue"
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  minWidth: 16,
                  height: 16,
                  fontSize: 10,
                  padding: 0,
                }}
              >
                {activeDownloadCount}
              </Badge>
            )}
          </ActionIcon>
        </Tooltip>

        {onCheckUpdates && (
          <Tooltip label="Check mod updates">
            <ActionIcon
              variant={updatesCount > 0 ? "light" : "default"}
              color={updatesCount > 0 ? "teal" : undefined}
              size="md"
              onClick={onCheckUpdates}
              loading={isCheckingUpdates}
              style={{ position: "relative" }}
            >
              <IconSparkles size={16} />
              {updatesCount > 0 && (
                <Badge
                  size="xs"
                  circle
                  color="teal"
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    minWidth: 16,
                    height: 16,
                    fontSize: 10,
                    padding: 0,
                  }}
                >
                  {updatesCount}
                </Badge>
              )}
            </ActionIcon>
          </Tooltip>
        )}

        <Tooltip label="Rescan mods directory">
          <ActionIcon
            variant="default"
            size="md"
            onClick={onRefresh}
            loading={isRefreshing}
          >
            <IconRefresh size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
}
