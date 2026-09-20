import { SimpleGrid, Stack } from "@mantine/core";
import { motion } from "motion/react";
import { ModItem, ModUpdateInfo } from "../types";
import { staggerItem } from "../motion";
import ModCard from "./ModCard";
import ModListItem from "./ModListItem";

interface ModGridItemsProps {
  mods: ModItem[];
  viewMode: "grid" | "list";
  conflictingModIds: Set<string>;
  updatesMap: Record<string, ModUpdateInfo>;
  isSelectMode: boolean;
  selectedModIds: Set<string>;
  onToggleSelect: (modId: string) => void;
  onToggle: (modId: string, enabled: boolean) => void;
  onMoveCategory: (mod: ModItem) => void;
  onOpenFolder: (folderPath: string) => void;
  onDelete: (mod: ModItem) => void;
  onOpenConflicts: () => void;
  onOpenKeybinds: (mod: ModItem) => void;
  onOpenGameBanana: (mod: ModItem) => void;
  onOpenLinkGameBanana: (mod: ModItem) => void;
  onSetPreview: (mod: ModItem) => void;
  activeGameId?: string;
}

export default function ModGridItems({
  mods,
  viewMode,
  conflictingModIds,
  updatesMap,
  isSelectMode,
  selectedModIds,
  onToggleSelect,
  onToggle,
  onMoveCategory,
  onOpenFolder,
  onDelete,
  onOpenConflicts,
  onOpenKeybinds,
  onOpenGameBanana,
  onOpenLinkGameBanana,
  onSetPreview,
  activeGameId,
}: ModGridItemsProps) {
  if (viewMode === "list") {
    return (
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
              onToggleSelect={onToggleSelect}
              onToggle={onToggle}
              onMoveCategory={onMoveCategory}
              onOpenFolder={onOpenFolder}
              onDelete={onDelete}
              onOpenConflicts={onOpenConflicts}
              onOpenKeybinds={onOpenKeybinds}
              onOpenGameBanana={onOpenGameBanana}
              onOpenLinkGameBanana={onOpenLinkGameBanana}
              onSetPreview={onSetPreview}
              isNtePak={activeGameId === "ntepak"}
            />
          </motion.div>
        ))}
      </Stack>
    );
  }

  return (
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
            onToggleSelect={onToggleSelect}
            onToggle={onToggle}
            onMoveCategory={onMoveCategory}
            onOpenFolder={onOpenFolder}
            onDelete={onDelete}
            onOpenConflicts={onOpenConflicts}
            onOpenKeybinds={onOpenKeybinds}
            onOpenGameBanana={onOpenGameBanana}
            onOpenLinkGameBanana={onOpenLinkGameBanana}
            onSetPreview={onSetPreview}
            isNtePak={activeGameId === "ntepak"}
          />
        </motion.div>
      ))}
    </SimpleGrid>
  );
}
