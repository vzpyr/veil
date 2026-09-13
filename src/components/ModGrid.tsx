import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Drawer,
  Group,
  Paper,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import {
  CheckSquare,
  FolderSymlink,
  FolderX,
  LayoutGrid,
  List,
  Power,
  PowerOff,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ConflictGroup, ModItem, ModUpdateInfo } from "../types";
import { staggerItem } from "../motion";
import ModCard from "./ModCard";
import ModListItem from "./ModListItem";

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
}: ModGridProps) {
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedModIds, setSelectedModIds] = useState<Set<string>>(new Set());
  const [deleteDrawerOpen, setDeleteDrawerOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingBatch, setIsTogglingBatch] = useState(false);

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

  const handleBatchEnable = async () => {
    if (selectedModIds.size === 0) return;
    setIsTogglingBatch(true);
    try {
      await onBatchToggle(Array.from(selectedModIds), true);
      setSelectedModIds(new Set());
      setIsSelectMode(false);
    } finally {
      setIsTogglingBatch(false);
    }
  };

  const handleBatchDisable = async () => {
    if (selectedModIds.size === 0) return;
    setIsTogglingBatch(true);
    try {
      await onBatchToggle(Array.from(selectedModIds), false);
      setSelectedModIds(new Set());
      setIsSelectMode(false);
    } finally {
      setIsTogglingBatch(false);
    }
  };

  const handleBatchMove = () => {
    if (selectedModsList.length === 0) return;
    onBatchMoveCategory(selectedModsList, () => {
      setSelectedModIds(new Set());
      setIsSelectMode(false);
    });
  };

  const confirmBatchDelete = async () => {
    if (selectedModsList.length === 0) return;
    setIsDeleting(true);
    try {
      await onBatchDelete(selectedModsList);
      setSelectedModIds(new Set());
      setIsSelectMode(false);
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
      <Group justify="space-between" mb="sm" wrap="wrap" gap="xs">
        <Group gap="xs">
          <SegmentedControl
            size="xs"
            value={statusFilter}
            onChange={(val) =>
              onStatusFilterChange(val as "all" | "enabled" | "disabled")
            }
            data={[
              {
                value: "all",
                label: (
                  <Center
                    h="var(--control-inner-height-xs)"
                    style={{
                      padding: "0 var(--space-xs)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    All ({totalCount})
                  </Center>
                ),
              },
              {
                value: "enabled",
                label: (
                  <Center
                    h="var(--control-inner-height-xs)"
                    style={{
                      padding: "0 var(--space-xs)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Enabled ({enabledCount})
                  </Center>
                ),
              },
              {
                value: "disabled",
                label: (
                  <Center
                    h="var(--control-inner-height-xs)"
                    style={{
                      padding: "0 var(--space-xs)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Disabled ({disabledCount})
                  </Center>
                ),
              },
            ]}
          />
          <Select
            size="xs"
            w="var(--control-width-sm)"
            value={sortBy}
            onChange={(val) => onSortByChange(val || "name-asc")}
            allowDeselect={false}
            data={[
              { value: "name-asc", label: "Name (A to Z)" },
              { value: "name-desc", label: "Name (Z to A)" },
              { value: "last-updated", label: "Last Updated" },
            ]}
          />
        </Group>
        <Group gap="xs">
          <SegmentedControl
            size="xs"
            value={viewMode}
            onChange={(val) => onViewModeChange(val as "grid" | "list")}
            data={[
              {
                value: "grid",
                label: (
                  <Center
                    h="var(--control-inner-height-xs)"
                    style={{ padding: "0 var(--space-3xs)" }}
                  >
                    <LayoutGrid size={14} />
                  </Center>
                ),
              },
              {
                value: "list",
                label: (
                  <Center
                    h="var(--control-inner-height-xs)"
                    style={{ padding: "0 var(--space-3xs)" }}
                  >
                    <List size={14} />
                  </Center>
                ),
              },
            ]}
          />
          <Button
            size="xs"
            variant={isSelectMode ? "filled" : "default"}
            leftSection={<CheckSquare size={14} />}
            onClick={toggleSelectMode}
            h="var(--control-height-xs)"
          >
            {isSelectMode ? "Done" : "Select"}
          </Button>
        </Group>
      </Group>

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
      ) : viewMode === "list" ? (
        <Stack gap="xs">
          {mods.map((mod, index) => (
            <motion.div
              key={mod.id}
              variants={staggerItem()}
              initial="hidden"
              animate="visible"
              custom={index}
            >
              <ModListItem
                mod={mod}
                inConflict={conflictingModIds.has(mod.id)}
                updateInfo={updatesMap[mod.id]}
                isSelectMode={isSelectMode}
                isSelected={selectedModIds.has(mod.id)}
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
              />
            </motion.div>
          ))}
        </Stack>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }} spacing="sm">
          {mods.map((mod, index) => (
            <motion.div
              key={mod.id}
              variants={staggerItem()}
              initial="hidden"
              animate="visible"
              custom={index}
              style={{ height: "100%" }}
            >
              <ModCard
                mod={mod}
                inConflict={conflictingModIds.has(mod.id)}
                updateInfo={updatesMap[mod.id]}
                isSelectMode={isSelectMode}
                isSelected={selectedModIds.has(mod.id)}
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
              />
            </motion.div>
          ))}
        </SimpleGrid>
      )}

      {isSelectMode && (
        <Box
          style={{
            position: "fixed",
            bottom: "var(--space-lg)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: "var(--z-index-floating-bar)",
            maxWidth: "var(--max-width-floating-bar)",
            width: "calc(100% - var(--space-2xl))",
          }}
        >
          <Card
            p="xs"
            style={{
              backgroundColor: "var(--color-bg-surface-3)",
              borderColor: "var(--color-border-strong)",
              boxShadow: "var(--shadow-lg)",
              borderRadius: "var(--radius-pill)",
            }}
            className="animate-fade-in-up"
          >
            <Group
              justify="space-between"
              align="center"
              gap="xs"
              wrap="nowrap"
            >
              <Group gap="xs" wrap="nowrap">
                <Badge
                  variant="filled"
                  color={selectedModIds.size > 0 ? "gray" : "dark"}
                  size="sm"
                >
                  {selectedModIds.size}{" "}
                  {selectedModIds.size === 1 ? "mod selected" : "mods selected"}
                </Badge>
                <Button
                  variant="subtle"
                  size="xs"
                  color="gray"
                  onClick={toggleSelectAll}
                >
                  {allVisibleSelected ? "Deselect All" : "Select All"}
                </Button>
              </Group>

              <Group gap="2xs" wrap="nowrap">
                <Button
                  variant="default"
                  size="xs"
                  leftSection={
                    <Power size={14} color="var(--color-status-success)" />
                  }
                  disabled={selectedModIds.size === 0 || isTogglingBatch}
                  loading={isTogglingBatch}
                  onClick={handleBatchEnable}
                >
                  Enable
                </Button>
                <Button
                  variant="default"
                  size="xs"
                  leftSection={
                    <PowerOff size={14} color="var(--color-status-warning)" />
                  }
                  disabled={selectedModIds.size === 0 || isTogglingBatch}
                  loading={isTogglingBatch}
                  onClick={handleBatchDisable}
                >
                  Disable
                </Button>
                <Button
                  variant="default"
                  size="xs"
                  leftSection={<FolderSymlink size={14} />}
                  disabled={selectedModIds.size === 0}
                  onClick={handleBatchMove}
                >
                  Move
                </Button>
                <Button
                  variant="filled"
                  color="red"
                  size="xs"
                  leftSection={<Trash2 size={14} />}
                  disabled={selectedModIds.size === 0}
                  onClick={() => setDeleteDrawerOpen(true)}
                >
                  Delete
                </Button>
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  color="gray"
                  onClick={() => {
                    setIsSelectMode(false);
                    setSelectedModIds(new Set());
                  }}
                >
                  <X size={14} />
                </ActionIcon>
              </Group>
            </Group>
          </Card>
        </Box>
      )}

      <Drawer
        opened={deleteDrawerOpen}
        onClose={() => !isDeleting && setDeleteDrawerOpen(false)}
        size="md"
        title={
          <Group gap="xs">
            <Trash2 size={20} color="var(--color-status-error)" />
            <Text fw={700} size="md">
              Delete Selected Mods
            </Text>
          </Group>
        }
      >
        <Stack gap="md" h="100%">
          <Text size="sm">
            Are you sure you want to permanently delete{" "}
            {selectedModsList.length}{" "}
            {selectedModsList.length === 1 ? "mod" : "mods"} from disk? This
            action cannot be undone.
          </Text>
          <ScrollArea style={{ flex: 1 }}>
            <Stack gap="2xs">
              {selectedModsList.map((m) => (
                <Paper key={m.id} p="xs">
                  <Text size="xs" fw={600} truncate>
                    {m.name}
                  </Text>
                  {m.category && (
                    <Text size="2xs" c="dimmed">
                      Category: {m.category}
                    </Text>
                  )}
                </Paper>
              ))}
            </Stack>
          </ScrollArea>
          <Group justify="flex-end" gap="xs" mt="auto">
            <Button
              variant="default"
              size="xs"
              disabled={isDeleting}
              onClick={() => setDeleteDrawerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="filled"
              color="red"
              size="xs"
              loading={isDeleting}
              onClick={confirmBatchDelete}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Drawer>
    </Box>
  );
}
