import {
  ActionIcon,
  Badge,
  Button,
  Center,
  Group,
  Image,
  SegmentedControl,
  Select,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  Download,
  Folder,
  Globe,
  RefreshCw,
  Settings,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { ConflictGroup, GameDefinition } from "../types";
import veilLogo from "../assets/veil.png";

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
    label: g.name,
  }));

  const tabData = [
    {
      value: "installed",
      label: (
        <Center
          style={{
            width: "100%",
            gap: "var(--space-2xs)",
            whiteSpace: "nowrap",
            padding: "0 var(--space-xs)",
          }}
        >
          <Folder size={16} />
          <Text size="xs" fw={600}>
            Installed
          </Text>
        </Center>
      ),
    },
    {
      value: "browser",
      label: (
        <Center
          style={{
            width: "100%",
            gap: "var(--space-2xs)",
            whiteSpace: "nowrap",
            padding: "0 var(--space-xs)",
          }}
        >
          <Globe size={16} />
          <Text size="xs" fw={600}>
            GameBanana
          </Text>
        </Center>
      ),
    },
    {
      value: "settings",
      label: (
        <Center
          style={{
            width: "100%",
            gap: "var(--space-2xs)",
            whiteSpace: "nowrap",
            padding: "0 var(--space-xs)",
          }}
        >
          <Settings size={16} />
          <Text size="xs" fw={600}>
            Settings
          </Text>
        </Center>
      ),
    },
  ];

  return (
    <Group
      h="var(--header-height)"
      px="sm"
      justify="space-between"
      style={{
        backgroundColor: "var(--color-bg-surface-1)",
        borderBottom: "1px solid var(--color-border-subtle)",
      }}
    >
      <Group gap="sm">
        <Image
          src={veilLogo}
          h="var(--size-logo-height)"
          w="auto"
          fit="contain"
          alt="veil"
        />

        <Select
          size="xs"
          w="var(--control-width-md)"
          data={gameSelectData}
          value={activeGameId}
          onChange={(val) => val && onSelectGame(val)}
          allowDeselect={false}
        />
      </Group>

      <SegmentedControl
        size="sm"
        radius="xl"
        withItemsBorders={false}
        value={activeTab}
        onChange={onSelectTab}
        data={tabData}
      />

      <Group gap="xs">
        {conflicts.length > 0 && (
          <Tooltip label={`${conflicts.length} mod conflicts detected`}>
            <Button
              size="xs"
              radius="xl"
              color="orange"
              variant="light"
              className="animate-scale-in"
              leftSection={<TriangleAlert size={14} />}
              onClick={onOpenConflicts}
            >
              Conflicts
              <Badge
                size="xs"
                radius="xl"
                color="orange"
                ml="xs"
                variant="filled"
              >
                {conflicts.length}
              </Badge>
            </Button>
          </Tooltip>
        )}

        <Tooltip label="Download queue">
          <ActionIcon
            variant={activeDownloadCount > 0 ? "light" : "default"}
            color={activeDownloadCount > 0 ? "gray" : undefined}
            size="md"
            radius="xl"
            onClick={onOpenDownloadQueue}
            style={{ position: "relative" }}
          >
            <Download size={16} />
            {activeDownloadCount > 0 && (
              <Badge
                size="xs"
                circle
                color="dark"
                className="badge-counter-dot"
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
              color={updatesCount > 0 ? "gray" : undefined}
              size="md"
              radius="xl"
              onClick={onCheckUpdates}
              loading={isCheckingUpdates}
              style={{ position: "relative" }}
            >
              <Sparkles size={16} />
              {updatesCount > 0 && (
                <Badge
                  size="xs"
                  circle
                  color="dark"
                  className="badge-counter-dot"
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
            radius="xl"
            onClick={onRefresh}
            loading={isRefreshing}
          >
            <RefreshCw size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
}
