import {
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useState } from "react";
import { CategoryItem, ModItem } from "../types";

interface CategoryModalProps {
  opened: boolean;
  onClose: () => void;
  categories: CategoryItem[];
  modToMove?: ModItem | null;
  onMoveMod: (modId: string, targetCategory: string | null) => void;
  onCreateCategory: (categoryName: string) => void;
}

export default function CategoryModal({
  opened,
  onClose,
  categories,
  modToMove,
  onMoveMod,
  onCreateCategory,
}: CategoryModalProps) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    modToMove?.category || "__root__",
  );

  const isMoveMode = Boolean(modToMove);

  const categoryOptions = [
    { value: "__root__", label: "Uncategorized (Root)" },
    ...categories.map((c) => ({ value: c.name, label: c.name })),
  ];

  const handleConfirm = () => {
    if (isMoveMode && modToMove) {
      const target = selectedCategory === "__root__" ? null : selectedCategory;
      onMoveMod(modToMove.id, target);
      onClose();
    } else {
      if (newCategoryName.trim()) {
        onCreateCategory(newCategoryName.trim());
        setNewCategoryName("");
        onClose();
      }
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={700} size="md">
          {isMoveMode ? `Move ${modToMove?.name}` : "Create New Category"}
        </Text>
      }
    >
      <Stack gap="md">
        {isMoveMode ? (
          <Select
            label="Destination Category"
            placeholder="Select a category"
            data={categoryOptions}
            value={selectedCategory}
            onChange={setSelectedCategory}
            allowDeselect={false}
          />
        ) : (
          <TextInput
            label="Category Name"
            placeholder="Enter category name (for example Jane Doe)"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleConfirm();
              }
            }}
          />
        )}

        <Group justify="flex-end" gap="xs">
          <Button variant="default" size="xs" onClick={onClose}>
            Cancel
          </Button>
          <Button size="xs" onClick={handleConfirm}>
            {isMoveMode ? "Move" : "Create"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
