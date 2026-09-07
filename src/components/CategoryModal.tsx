import {
  Button,
  Checkbox,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { CategoryItem, ModItem } from "../types";

export type CategoryModalMode = "create" | "move" | "rename" | "delete";

interface CategoryModalProps {
  opened: boolean;
  onClose: () => void;
  mode: CategoryModalMode;
  categories: CategoryItem[];
  modToMove?: ModItem | null;
  categoryName?: string | null;
  onMoveMod: (modId: string, targetCategory: string | null) => void;
  onCreateCategory: (categoryName: string) => void;
  onRenameCategory: (oldName: string, newName: string) => void;
  onDeleteCategory: (categoryName: string, deleteMods: boolean) => void;
}

export default function CategoryModal({
  opened,
  onClose,
  mode,
  categories,
  modToMove,
  categoryName,
  onMoveMod,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory,
}: CategoryModalProps) {
  const [nameInput, setNameInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    modToMove?.category || "__root__",
  );
  const [deleteMods, setDeleteMods] = useState(false);

  useEffect(() => {
    if (mode === "rename" && categoryName) {
      setNameInput(categoryName);
    } else if (mode === "create") {
      setNameInput("");
    } else if (mode === "move") {
      setSelectedCategory(modToMove?.category || "__root__");
    } else if (mode === "delete") {
      setDeleteMods(false);
    }
  }, [mode, categoryName, modToMove, opened]);

  const categoryOptions = [
    { value: "__root__", label: "Uncategorized" },
    ...categories.map((c) => ({ value: c.name, label: c.name })),
  ];

  const handleConfirm = () => {
    if (mode === "move" && modToMove) {
      const target = selectedCategory === "__root__" ? null : selectedCategory;
      onMoveMod(modToMove.id, target);
      onClose();
    } else if (mode === "create") {
      const trimmed = nameInput.trim();
      if (trimmed && trimmed.toLowerCase() !== "uncategorized") {
        onCreateCategory(trimmed);
        setNameInput("");
        onClose();
      }
    } else if (mode === "rename" && categoryName) {
      const trimmed = nameInput.trim();
      if (
        trimmed &&
        trimmed !== categoryName &&
        trimmed.toLowerCase() !== "uncategorized"
      ) {
        onRenameCategory(categoryName, trimmed);
        onClose();
      }
    } else if (mode === "delete" && categoryName) {
      onDeleteCategory(categoryName, deleteMods);
      onClose();
    }
  };

  const getTitle = () => {
    switch (mode) {
      case "move":
        return `Move ${modToMove?.name}`;
      case "rename":
        return `Rename Category: ${categoryName}`;
      case "delete":
        return `Delete Category: ${categoryName}`;
      case "create":
      default:
        return "Create New Category";
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      radius="lg"
      title={
        <Text fw={700} size="md">
          {getTitle()}
        </Text>
      }
    >
      <Stack gap="md">
        {mode === "move" && (
          <Select
            label="Destination Category"
            placeholder="Select a category"
            radius="md"
            data={categoryOptions}
            value={selectedCategory}
            onChange={setSelectedCategory}
            allowDeselect={false}
          />
        )}

        {(mode === "create" || mode === "rename") && (
          <TextInput
            label="Category Name"
            placeholder="Enter category name (for example Jane Doe)"
            radius="md"
            value={nameInput}
            onChange={(e) => setNameInput(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleConfirm();
              }
            }}
          />
        )}

        {mode === "delete" && (
          <Stack gap="xs">
            <Text size="sm">
              Are you sure you want to delete the category folder{" "}
              <Text span fw={700}>
                {categoryName}
              </Text>
              ?
            </Text>
            <Checkbox
              label="Also delete all mod files inside this category from disk"
              checked={deleteMods}
              onChange={(e) => setDeleteMods(e.currentTarget.checked)}
              color="red"
            />
            {!deleteMods && (
              <Text size="xs" c="dimmed">
                Mods inside this category will be preserved and moved to
                Uncategorized.
              </Text>
            )}
          </Stack>
        )}

        <Group justify="flex-end" gap="xs">
          <Button variant="default" size="xs" radius="xl" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="xs"
            radius="xl"
            color={mode === "delete" ? "red" : undefined}
            onClick={handleConfirm}
          >
            {mode === "move"
              ? "Move"
              : mode === "rename"
                ? "Rename"
                : mode === "delete"
                  ? "Delete"
                  : "Create"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
