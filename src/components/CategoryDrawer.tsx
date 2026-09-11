import {
  Button,
  Checkbox,
  Drawer,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { Folder } from "lucide-react";
import { useEffect, useState } from "react";
import { CategoryItem, ModItem } from "../types";

export type CategoryDrawerMode = "create" | "move" | "rename" | "delete";

interface CategoryDrawerProps {
  opened: boolean;
  onClose: () => void;
  mode: CategoryDrawerMode;
  categories: CategoryItem[];
  modToMove?: ModItem | null;
  categoryName?: string | null;
  onMoveMod: (modId: string, targetCategory: string | null) => void;
  onCreateCategory: (categoryName: string) => void;
  onRenameCategory: (oldName: string, newName: string) => void;
  onDeleteCategory: (categoryName: string, deleteMods: boolean) => void;
}

export default function CategoryDrawer({
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
}: CategoryDrawerProps) {
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

  const isConfirmDisabled =
    (mode === "create" &&
      (!nameInput.trim() ||
        nameInput.trim().toLowerCase() === "uncategorized")) ||
    (mode === "rename" &&
      (!nameInput.trim() ||
        nameInput.trim() === categoryName ||
        nameInput.trim().toLowerCase() === "uncategorized"));

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
        return `Move ${modToMove?.name || "Mod"}`;
      case "rename":
        return `Rename ${categoryName || "Category"}`;
      case "delete":
        return `Delete ${categoryName || "Category"}`;
      case "create":
      default:
        return "Create New Category";
    }
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      size="md"
      title={
        <Group gap="xs">
          <Folder size={20} color="var(--color-accent-primary)" />
          <Text fw={700} size="md">
            {getTitle()}
          </Text>
        </Group>
      }
    >
      <Stack gap="md" h="100%">
        {mode === "move" && (
          <Select
            label="Destination Category"
            placeholder="Select a category"
            data={categoryOptions}
            value={selectedCategory}
            onChange={setSelectedCategory}
            allowDeselect={false}
          />
        )}

        {(mode === "create" || mode === "rename") && (
          <TextInput
            label={mode === "create" ? "Category Name" : "New Category Name"}
            placeholder="e.g. Characters or Weapons"
            value={nameInput}
            onChange={(e) => setNameInput(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isConfirmDisabled) {
                handleConfirm();
              }
            }}
            data-autofocus
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
          </Stack>
        )}

        <Group justify="flex-end" gap="xs" mt="auto">
          <Button variant="default" size="xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="filled"
            size="xs"
            color={mode === "delete" ? "red" : undefined}
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
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
    </Drawer>
  );
}
