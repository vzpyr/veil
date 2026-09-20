import { Box, Button, Center, Stack, Text } from "@mantine/core";
import { FolderX, Settings } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ConflictGroup, ModItem, ModUpdateInfo } from "../types";
import ModBatchBar from "./ModBatchBar";
import ModBatchDeleteDrawer from "./ModBatchDeleteDrawer";
import ModGridItems from "./ModGridItems";
import ModGridToolbar from "./ModGridToolbar";

interface ModGridProps {
  mods: ModItem[];
  hasModsDir: boolean;
  conflicts: ConflictGroup[];
  updatesMap: Record<string, ModUpdateInfo>;
  statusFilter: "all" | "enabled" | "disabled";
  onStatusFilterChange: (filter: "all" | "enabled" | "disabled") => void;
  sortBy: string;
  onSortByChange: (sort: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  totalCount: number;
  enabledCount: number;
  disabledCount: number;
  onToggle: (modId: string, enabled: boolean) => void;
  onMoveCategory: (mod: ModItem) => void;
  onOpenFolder: (folderPath: string) => void;
  onDelete: (mod: ModItem) => void;
  onOpenConflicts: () => void;
  onOpenSettings: () => void;
  onOpenKeybinds: (mod: ModItem) => void;
  onOpenGameBanana: (mod: ModItem) => void;
  onOpenLinkGameBanana: (mod: ModItem) => void;
  onSetPreview: (mod: ModItem) => void;
  onBatchToggle: (modIds: string[], enable: boolean) => Promise<void>;
  onBatchMoveCategory: (mods: ModItem[], onDone?: () => void) => void;
  onBatchDelete: (mods: ModItem[]) => Promise<void>;
  activeGameId?: string;
}

export default function ModGrid({
  mods,
  hasModsDir,
  conflicts,
  updatesMap,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  viewMode,
  onViewModeChange,
  totalCount,
  enabledCount,
  disabledCount,
  onToggle,
  onMoveCategory,
  onOpenFolder,
  onDelete,
  onOpenConflicts,
  onOpenSettings,
  onOpenKeybinds,
  onOpenGameBanana,
  onOpenLinkGameBanana,
  onSetPreview,
  onBatchToggle,
  onBatchMoveCategory,
  onBatchDelete,
  activeGameId,
}: ModGridProps) {
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedModIds, setSelectedModIds] = useState<Set<string>>(new Set());
  const [deleteDrawerOpen, setDeleteDrawerOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingBatch, setIsTogglingBatch] = useState(false);

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedModIds(new Set());
  };

  const toggleSelectMode = () => {
    setIsSelectMode((prev) => {
      if (prev) {
        setSelectedModIds(new Set());
      }
      return !prev;
    });
  };

  const handleToggleSelect = (modId: string) => {
    setSelectedModIds((prev) => {
      const next = new Set(prev);
      if (next.has(modId)) {
        next.delete(modId);
      } else {
        next.add(modId);
      }
      return next;
    });
  };

  const allVisibleSelected =
    mods.length > 0 && mods.every((m) => selectedModIds.has(m.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedModIds(new Set());
    } else {
      setSelectedModIds(new Set(mods.map((m) => m.id)));
    }
  };

  useEffect(() => {
    setSelectedModIds((prev) => {
      if (prev.size === 0) return prev;
      const validIds = new Set(mods.map((m) => m.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (validIds.has(id)) {
          next.add(id);
        }
      });
      return next.size === prev.size ? prev : next;
    });
  }, [mods]);

  const selectedModsList = useMemo(
    () => mods.filter((m) => selectedModIds.has(m.id)),
    [mods, selectedModIds],
  );

  const handleBatchToggle = async (enable: boolean) => {
    if (selectedModIds.size === 0) return;
    setIsTogglingBatch(true);
    try {
      await onBatchToggle(Array.from(selectedModIds), enable);
      exitSelectMode();
    } finally {
      setIsTogglingBatch(false);
    }
  };

  const handleBatchMove = () => {
    if (selectedModsList.length === 0) return;
    onBatchMoveCategory(selectedModsList, exitSelectMode);
  };

  const confirmBatchDelete = async () => {
    if (selectedModsList.length === 0) return;
    setIsDeleting(true);
    try {
      await onBatchDelete(selectedModsList);
      exitSelectMode();
      setDeleteDrawerOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!hasModsDir) {
    return (
      <Center h="100%" p="xl">
        <Stack align="center" gap="md" className="animate-fade-in-up">
          <Settings size={48} color="var(--color-text-muted)" />
          <Text fw={600} size="lg">
            No Mods Directory Configured
          </Text>
          <Text c="dimmed" size="sm" ta="center" maw="var(--max-width-text-lg)">
            Configure your mods directory in Settings to begin managing mods
            with Veil.
          </Text>
          <Button
            variant="filled"
            size="sm"
            leftSection={<Settings size={16} />}
            onClick={onOpenSettings}
          >
            Configure Directory
          </Button>
        </Stack>
      </Center>
    );
  }

  const conflictingModIds = new Set<string>();
  for (const c of conflicts) {
    for (const id of c.mod_ids) {
      conflictingModIds.add(id);
    }
  }

  return (
    <Box p="sm">
      <ModGridToolbar
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        totalCount={totalCount}
        enabledCount={enabledCount}
        disabledCount={disabledCount}
        sortBy={sortBy}
        onSortByChange={onSortByChange}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        isSelectMode={isSelectMode}
        onToggleSelectMode={toggleSelectMode}
      />

      {mods.length === 0 ? (
        <Center h="var(--height-empty-state)">
          <Stack align="center" gap="sm" className="animate-fade-in-up">
            <FolderX size={44} color="var(--color-text-muted)" />
            <Text fw={600} size="md">
              No Mods Found
            </Text>
            <Text
              c="dimmed"
              size="xs"
              ta="center"
              maw="var(--max-width-text-md)"
            >
              No mods match your current filter or category.
            </Text>
          </Stack>
        </Center>
      ) : (
        <ModGridItems
          mods={mods}
          viewMode={viewMode}
          conflictingModIds={conflictingModIds}
          updatesMap={updatesMap}
          isSelectMode={isSelectMode}
          selectedModIds={selectedModIds}
          onToggleSelect={handleToggleSelect}
          onToggle={onToggle}
          onMoveCategory={onMoveCategory}
          onOpenFolder={onOpenFolder}
          onDelete={onDelete}
          onOpenConflicts={onOpenConflicts}
          onOpenKeybinds={onOpenKeybinds}
          onOpenGameBanana={onOpenGameBanana}
          onOpenLinkGameBanana={onOpenLinkGameBanana}
          onSetPreview={onSetPreview}
          activeGameId={activeGameId}
        />
      )}

      {isSelectMode && (
        <ModBatchBar
          selectedCount={selectedModIds.size}
          allVisibleSelected={allVisibleSelected}
          isTogglingBatch={isTogglingBatch}
          onToggleSelectAll={toggleSelectAll}
          onEnable={() => handleBatchToggle(true)}
          onDisable={() => handleBatchToggle(false)}
          onMove={handleBatchMove}
          onDelete={() => setDeleteDrawerOpen(true)}
          onClose={exitSelectMode}
        />
      )}

      <ModBatchDeleteDrawer
        opened={deleteDrawerOpen}
        mods={selectedModsList}
        isDeleting={isDeleting}
        onClose={() => setDeleteDrawerOpen(false)}
        onConfirm={confirmBatchDelete}
      />
    </Box>
  );
}
