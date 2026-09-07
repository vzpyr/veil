import { Box, Button, Center, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconFolderOff, IconSettings } from "@tabler/icons-react";
import { ConflictGroup, ModItem, ModUpdateInfo } from "../types";
import ModCard from "./ModCard";

interface ModGridProps {
  mods: ModItem[];
  hasModsDir: boolean;
  conflicts: ConflictGroup[];
  updatesMap: Record<string, ModUpdateInfo>;
  onToggle: (modId: string, enabled: boolean) => void;
  onMoveCategory: (mod: ModItem) => void;
  onReveal: (folderPath: string) => void;
  onDelete: (mod: ModItem) => void;
  onOpenConflicts: () => void;
  onOpenSettings: () => void;
  onOpenKeybinds: (mod: ModItem) => void;
  onOpenUpdate: (mod: ModItem, updateInfo: ModUpdateInfo) => void;
  onOpenLinkGameBanana: (mod: ModItem) => void;
}

export default function ModGrid({
  mods,
  hasModsDir,
  conflicts,
  updatesMap,
  onToggle,
  onMoveCategory,
  onReveal,
  onDelete,
  onOpenConflicts,
  onOpenSettings,
  onOpenKeybinds,
  onOpenUpdate,
  onOpenLinkGameBanana,
}: ModGridProps) {
  if (!hasModsDir) {
    return (
      <Center h="100%" p="xl">
        <Stack align="center" gap="md">
          <IconSettings size={48} color="var(--color-text-muted)" />
          <Text fw={600} size="lg">
            No Mods Directory Configured
          </Text>
          <Text c="dimmed" size="sm" ta="center" maw={400}>
            Configure your game mods directory in settings to begin managing
            mods with Veil.
          </Text>
          <Button
            variant="light"
            size="sm"
            leftSection={<IconSettings size={16} />}
            onClick={onOpenSettings}
          >
            Configure Directory
          </Button>
        </Stack>
      </Center>
    );
  }

  if (mods.length === 0) {
    return (
      <Center h="100%" p="xl">
        <Stack align="center" gap="sm">
          <IconFolderOff size={48} color="var(--color-text-muted)" />
          <Text fw={600} size="lg">
            No Mods Found
          </Text>
          <Text c="dimmed" size="sm" ta="center" maw={400}>
            No mods match your current filter or category. Download mods from
            GameBanana or place folders into your DISABLED_veil directory.
          </Text>
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
    <Box p="md">
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }} spacing="md">
        {mods.map((mod) => (
          <ModCard
            key={mod.id}
            mod={mod}
            inConflict={conflictingModIds.has(mod.id)}
            updateInfo={updatesMap[mod.id]}
            onToggle={onToggle}
            onMoveCategory={onMoveCategory}
            onReveal={onReveal}
            onDelete={onDelete}
            onOpenConflicts={onOpenConflicts}
            onOpenKeybinds={onOpenKeybinds}
            onOpenUpdate={onOpenUpdate}
            onOpenLinkGameBanana={onOpenLinkGameBanana}
          />
        ))}
      </SimpleGrid>
    </Box>
  );
}
