import {
  Button,
  Drawer,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconPackageImport } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { CategoryItem } from "../types";

interface ManualInstallDrawerProps {
  opened: boolean;
  onClose: () => void;
  archivePath: string;
  categories: CategoryItem[];
  onInstall: (
    modName: string,
    category: string | null,
    duplicateAction: string,
  ) => Promise<void>;
  isInstalling: boolean;
}

export default function ManualInstallDrawer({
  opened,
  onClose,
  archivePath,
  categories,
  onInstall,
  isInstalling,
}: ManualInstallDrawerProps) {
  const [modName, setModName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    "__root__",
  );
  const [duplicateAction, setDuplicateAction] = useState<string>("replace");

  useEffect(() => {
    if (archivePath) {
      const fileName = archivePath.split(/[/\\]/).pop() || "";
      const baseName = fileName.replace(/\.(zip|7z|rar|tar|gz)$/i, "");
      setModName(baseName);
      setSelectedCategory("__root__");
      setDuplicateAction("replace");
    }
  }, [archivePath]);

  const categoryOptions = [
    { value: "__root__", label: "Uncategorized" },
    ...categories.map((c) => ({ value: c.name, label: c.name })),
  ];

  const duplicateOptions = [
    { value: "replace", label: "Replace existing files if duplicate" },
    { value: "keep_both", label: "Keep both with numerical suffix" },
  ];

  const handleConfirm = async () => {
    if (!modName.trim()) {
      return;
    }
    const targetCategory =
      selectedCategory === "__root__" ? null : selectedCategory;
    await onInstall(modName.trim(), targetCategory, duplicateAction);
    onClose();
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="md"
      radius="lg"
      title={
        <Group gap="xs">
          <IconPackageImport size={20} color="var(--color-accent-primary)" />
          <Text fw={700} size="md">
            Install Mod from Archive
          </Text>
        </Group>
      }
    >
      <Stack gap="md" h="100%">
        <TextInput
          label="Mod Name"
          description="Folder name where the mod files will be placed"
          radius="xl"
          value={modName}
          onChange={(e) => setModName(e.currentTarget.value)}
          required
        />

        <Select
          label="Category"
          description="Target category folder inside mods directory"
          radius="xl"
          data={categoryOptions}
          value={selectedCategory}
          onChange={setSelectedCategory}
          allowDeselect={false}
        />

        <Select
          label="Duplicate Handling"
          description="Action to take if a folder with this name already exists"
          radius="xl"
          data={duplicateOptions}
          value={duplicateAction}
          onChange={(val) => setDuplicateAction(val || "replace")}
          allowDeselect={false}
        />

        <Group justify="flex-end" gap="xs" mt="auto">
          <Button
            variant="default"
            size="xs"
            radius="xl"
            onClick={onClose}
            disabled={isInstalling}
          >
            Cancel
          </Button>
          <Button
            variant="filled"
            size="xs"
            radius="xl"
            onClick={handleConfirm}
            loading={isInstalling}
            disabled={!modName.trim()}
          >
            Install
          </Button>
        </Group>
      </Stack>
    </Drawer>
  );
}
