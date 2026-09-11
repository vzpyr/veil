import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Image,
  SegmentedControl,
  Select,
  Text,
  Tooltip,
} from "@mantine/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  Copy,
  Download,
  Folder,
  Globe,
  Minus,
  Settings,
  Square,
  TriangleAlert,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  activeDownloadCount: number;
  onOpenDownloadQueue: () => void;
}

export default function Header({
  games,
  activeGameId,
  onSelectGame,
  activeTab,
  onSelectTab,
  conflicts,
  onOpenConflicts,
  activeDownloadCount,
  onOpenDownloadQueue,
}: HeaderProps) {
  const appWindow = useMemo(() => getCurrentWindow(), []);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    const syncMaximized = () => {
      void appWindow.isMaximized().then((maximized) => {
        if (!disposed) {
          setIsMaximized(maximized);
        }
      });
    };

    void appWindow.onResized(syncMaximized).then((fn) => {
      if (disposed) {
        fn();
        return;
      }
      unlisten = fn;
    });
    syncMaximized();

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [appWindow]);

  const handleMinimize = () => void appWindow.minimize();
  const handleToggleMaximize = () => void appWindow.toggleMaximize();
  const handleClose = () => void appWindow.close();

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
          <Text c="inherit" size="xs" fw={600}>
            Mods
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
          <Text c="inherit" size="xs" fw={600}>
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
          <Text c="inherit" size="xs" fw={600}>
            Settings
          </Text>
        </Center>
      ),
    },
  ];

  return (
    <Box
      h="var(--header-height)"
      px="sm"
      data-tauri-drag-region="deep"
      style={{
        backgroundColor: "var(--color-bg-surface-1)",
        borderBottom: "1px solid var(--color-border-subtle)",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
        alignItems: "center",
      }}
    >
      <Group gap="sm" wrap="nowrap" style={{ justifySelf: "start" }}>
        <Image
          src={veilLogo}
          h="var(--size-logo-height)"
          w="auto"
          fit="contain"
          alt="veil"
        />

        <Select
          size="xs"
          w="var(--control-width-sm)"
          data={gameSelectData}
          value={activeGameId}
          onChange={(val) => val && onSelectGame(val)}
          allowDeselect={false}
        />
      </Group>

      <SegmentedControl
        size="sm"
        value={activeTab}
        onChange={onSelectTab}
        data={tabData}
      />

      <Group gap="xs" wrap="nowrap" style={{ justifySelf: "end" }}>
        {conflicts.length > 0 && (
          <Tooltip
            label={`${conflicts.length} mod ${conflicts.length === 1 ? "conflict" : "conflicts"} detected`}
          >
            <Button
              size="xs"
              color="orange"
              variant="light"
              className="animate-scale-in"
              leftSection={<TriangleAlert size={14} />}
              onClick={onOpenConflicts}
            >
              Conflicts
              <Badge size="xs" color="orange" ml="xs" variant="filled">
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

        <Box
          w="var(--size-hairline)"
          h="var(--space-lg)"
          style={{ backgroundColor: "var(--color-border-strong)" }}
        />

        <Tooltip label="Minimize">
          <ActionIcon variant="subtle" size="md" onClick={handleMinimize}>
            <Minus size={16} />
          </ActionIcon>
        </Tooltip>

        <Tooltip label={isMaximized ? "Restore" : "Maximize"}>
          <ActionIcon variant="subtle" size="md" onClick={handleToggleMaximize}>
            {isMaximized ? <Copy size={16} /> : <Square size={16} />}
          </ActionIcon>
        </Tooltip>

        <Tooltip label="Close">
          <ActionIcon variant="subtle" size="md" onClick={handleClose}>
            <X size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Box>
  );
}
