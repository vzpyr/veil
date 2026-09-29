import { Badge, Button, Divider, Stack, Tooltip } from "@mantine/core";
import {
  FolderOpen,
  FolderPlus,
  PackagePlus,
  RefreshCw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { ConflictGroup, ModItem, ModPreset } from "../types";
import SidebarPresets from "./SidebarPresets";

interface SidebarActionsProps {
  conflicts: ConflictGroup[];
  onOpenConflicts: () => void;
  presets: ModPreset[];
  selectedPresetId: string | null;
  onSelectPreset: (presetId: string | null) => void;
  mods: ModItem[];
  onOpenSavePreset: () => void;
  onApplyPreset: () => void;
  onDeletePreset: () => void;
  onOpenCreateCategory: () => void;
  onOpenModsFolder: () => void;
  onOpenManualInstall: () => void;
  onCheckUpdates: () => void;
  isCheckingUpdates: boolean;
  onRescanMods: () => void;
  isRefreshing: boolean;
  hasModsDir: boolean;
  isApplyingPreset?: boolean;
}

export default function SidebarActions({
  conflicts,
  onOpenConflicts,
  presets,
  selectedPresetId,
  onSelectPreset,
  mods,
  onOpenSavePreset,
  onApplyPreset,
  onDeletePreset,
  onOpenCreateCategory,
  onOpenModsFolder,
  onOpenManualInstall,
  onCheckUpdates,
  isCheckingUpdates,
  onRescanMods,
  isRefreshing,
  hasModsDir,
  isApplyingPreset,
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

      <SidebarPresets
        presets={presets}
        selectedPresetId={selectedPresetId}
        onSelectPreset={onSelectPreset}
        mods={mods}
        onOpenSaveModal={onOpenSavePreset}
        onApplyPreset={onApplyPreset}
        onDeletePreset={onDeletePreset}
        hasModsDir={hasModsDir}
        isApplying={isApplyingPreset}
      />

      <Divider color="var(--color-border-subtle)" my="3xs" />

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
