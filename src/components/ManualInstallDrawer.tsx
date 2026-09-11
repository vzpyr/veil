import {
  Button,
  Drawer,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { PackagePlus } from "lucide-react";
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
    { value: "replace", label: "Replace existing files" },
    { value: "keep_both", label: "Keep both versions" },
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
      size="md"
      title={
        <Group gap="xs">
          <PackagePlus size={20} color="var(--color-accent-primary)" />
          <Text fw={700} size="md">
            Install Mod from Archive
          </Text>
        </Group>
      }
    >
      <Stack gap="md" h="100%">
        <TextInput
          label="Mod Name"
          value={modName}
          onChange={(e) => setModName(e.currentTarget.value)}
          required
        />

        <Select
          label="Category"
          data={categoryOptions}
          value={selectedCategory}
          onChange={setSelectedCategory}
          allowDeselect={false}
        />

        <Select
          label="Duplicate Handling"
          data={duplicateOptions}
          value={duplicateAction}
          onChange={(val) => setDuplicateAction(val || "replace")}
          allowDeselect={false}
        />

        <Group justify="flex-end" gap="xs" mt="auto">
          <Button
            variant="default"
            size="xs"
            onClick={onClose}
            disabled={isInstalling}
          >
            Cancel
          </Button>
          <Button
            variant="filled"
            size="xs"
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
