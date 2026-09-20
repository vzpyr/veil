import { Badge, Button, Stack, Tooltip } from "@mantine/core";
import {
  FolderOpen,
  FolderPlus,
  PackagePlus,
  RefreshCw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { ConflictGroup } from "../types";

interface SidebarActionsProps {
  conflicts: ConflictGroup[];
  onOpenConflicts: () => void;
  onOpenCreateCategory: () => void;
  onOpenModsFolder: () => void;
  onOpenManualInstall: () => void;
  onCheckUpdates: () => void;
  isCheckingUpdates: boolean;
  onRescanMods: () => void;
  isRefreshing: boolean;
  hasModsDir: boolean;
}

export default function SidebarActions({
  conflicts,
  onOpenConflicts,
  onOpenCreateCategory,
  onOpenModsFolder,
  onOpenManualInstall,
  onCheckUpdates,
  isCheckingUpdates,
  onRescanMods,
  isRefreshing,
  hasModsDir,
}: SidebarActionsProps) {
  return (
    <Stack gap="xs">
      {conflicts.length > 0 && (
        <Tooltip
          label={`${conflicts.length} mod ${conflicts.length === 1 ? "conflict" : "conflicts"} detected`}
        >
          <Button
            fullWidth
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
      <Button
        fullWidth
        variant="default"
        size="xs"
        leftSection={<FolderPlus size={14} />}
        onClick={onOpenCreateCategory}
        disabled={!hasModsDir}
      >
        New category
      </Button>
      <Button
        fullWidth
        variant="default"
        size="xs"
        leftSection={<FolderOpen size={14} />}
        onClick={onOpenModsFolder}
        disabled={!hasModsDir}
      >
        Open mods folder
      </Button>
      <Button
        fullWidth
        variant="default"
        size="xs"
        leftSection={<PackagePlus size={14} />}
        onClick={onOpenManualInstall}
        disabled={!hasModsDir}
      >
        Install mods
      </Button>
      <Button
        fullWidth
        variant="default"
        size="xs"
        leftSection={<Sparkles size={14} />}
        onClick={onCheckUpdates}
        disabled={!hasModsDir || isCheckingUpdates}
      >
        Check updates
      </Button>
      <Button
        fullWidth
        variant="default"
        size="xs"
        leftSection={<RefreshCw size={14} />}
        onClick={onRescanMods}
        disabled={!hasModsDir || isRefreshing}
      >
        Rescan mods
      </Button>
    </Stack>
  );
}
