import {
  Box,
  Button,
  Center,
  Group,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { FolderX, LayoutGrid, List, Settings } from "lucide-react";
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
}: ModGridProps) {
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
        <Group gap="xs">
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
    </Box>
  );
}
