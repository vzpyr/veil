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

type CategoryDrawerMode = "create" | "move" | "rename" | "delete";

interface CategoryDrawerProps {
  opened: boolean;
  onClose: () => void;
  mode: CategoryDrawerMode;
  categories: CategoryItem[];
  modToMove?: ModItem | null;
  modsToMove?: ModItem[] | null;
  categoryName?: string | null;
  onMoveMod?: (modId: string, targetCategory: string | null) => void;
  onMoveMods?: (modIds: string[], targetCategory: string | null) => void;
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
  modsToMove,
  categoryName,
  onMoveMod,
  onMoveMods,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory,
}: CategoryDrawerProps) {
  const activeModsToMove =
    modsToMove && modsToMove.length > 0
      ? modsToMove
      : modToMove
        ? [modToMove]
        : [];
  const [nameInput, setNameInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    activeModsToMove[0]?.category || "__root__",
  );
  const [deleteMods, setDeleteMods] = useState(false);

  useEffect(() => {
    if (mode === "rename" && categoryName) {
      setNameInput(categoryName);
    } else if (mode === "create") {
      setNameInput("");
    } else if (mode === "move") {
      setSelectedCategory(activeModsToMove[0]?.category || "__root__");
    } else if (mode === "delete") {
      setDeleteMods(false);
    }
  }, [mode, categoryName, modToMove, modsToMove, opened]);

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
    if (mode === "move") {
      const target = selectedCategory === "__root__" ? null : selectedCategory;
      if (onMoveMods && activeModsToMove.length > 0) {
        onMoveMods(
          activeModsToMove.map((m) => m.id),
          target,
        );
      } else if (onMoveMod && activeModsToMove.length > 0) {
        onMoveMod(activeModsToMove[0].id, target);
      }
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
        if (activeModsToMove.length === 1) {
          return `Move ${activeModsToMove[0].name}`;
        }
        if (activeModsToMove.length > 1) {
          return `Move ${activeModsToMove.length} mods`;
        }
        return "Move mods";
      case "rename":
        return `Rename ${categoryName || "Category"}`;
      case "delete":
        return `Delete ${categoryName || "Category"}`;
      case "create":
      default:
        return "Create new category";
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
            label="Destination category"
            placeholder="Select a category"
            data={categoryOptions}
            value={selectedCategory}
            onChange={setSelectedCategory}
            allowDeselect={false}
          />
        )}

        {(mode === "create" || mode === "rename") && (
          <TextInput
            label={mode === "create" ? "Category name" : "New category name"}
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
              Delete the{" "}
              <Text span fw={700}>
                {categoryName}
              </Text>{" "}
              category? Its mods move to Uncategorized.
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
