import {
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { CategoryItem } from "../types";

interface ManualInstallModalProps {
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

export default function ManualInstallModal({
  opened,
  onClose,
  archivePath,
  categories,
  onInstall,
  isInstalling,
}: ManualInstallModalProps) {
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
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={700} size="md">
          Install Mod from Archive
        </Text>
      }
    >
      <Stack gap="md">
        <TextInput
          label="Mod Name"
          description="Folder name where the mod files will be placed"
          value={modName}
          onChange={(e) => setModName(e.currentTarget.value)}
          required
        />

        <Select
          label="Category"
          description="Target category folder inside mods directory"
          data={categoryOptions}
          value={selectedCategory}
          onChange={setSelectedCategory}
          allowDeselect={false}
        />

        <Select
          label="Duplicate Handling"
          description="Action to take if a folder with this name already exists"
          data={duplicateOptions}
          value={duplicateAction}
          onChange={(val) => setDuplicateAction(val || "replace")}
          allowDeselect={false}
        />

        <Group justify="flex-end" gap="xs" mt="sm">
          <Button
            variant="default"
            size="xs"
            onClick={onClose}
            disabled={isInstalling}
          >
            Cancel
          </Button>
          <Button
            size="xs"
            onClick={handleConfirm}
            loading={isInstalling}
            disabled={!modName.trim()}
          >
            Install
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
