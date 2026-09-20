import {
  ActionIcon,
  Box,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { Search, X } from "lucide-react";
import { CategoryItem, ConflictGroup } from "../types";
import SidebarActions from "./SidebarActions";
import SidebarCategoryList from "./SidebarCategoryList";

interface SidebarProps {
  categories: CategoryItem[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  totalModsCount: number;
  uncategorizedCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  conflicts: ConflictGroup[];
  onOpenConflicts: () => void;
  onOpenCreateCategory: () => void;
  onRenameCategory: (categoryName: string) => void;
  onDeleteCategory: (categoryName: string) => void;
  onOpenManualInstall: () => void;
  onOpenModsFolder: () => void;
  onCheckUpdates: () => void;
  isCheckingUpdates: boolean;
  onRescanMods: () => void;
  isRefreshing: boolean;
  hasModsDir: boolean;
}

export default function Sidebar({
  categories,
  selectedCategory,
  onSelectCategory,
  totalModsCount,
  uncategorizedCount,
  searchQuery,
  onSearchChange,
  conflicts,
  onOpenConflicts,
  onOpenCreateCategory,
  onRenameCategory,
  onDeleteCategory,
  onOpenManualInstall,
  onOpenModsFolder,
  onCheckUpdates,
  isCheckingUpdates,
  onRescanMods,
  isRefreshing,
  hasModsDir,
}: SidebarProps) {
  return (
    <Stack
      w="var(--sidebar-width)"
      h="100%"
      p="sm"
      gap="xs"
      style={{
        backgroundColor: "var(--color-bg-surface-1)",
        borderRight: "1px solid var(--color-border-subtle)",
      }}
    >
      <TextInput
        size="xs"
        placeholder="Filter mods..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.currentTarget.value)}
        leftSection={<Search size={14} />}
        rightSection={
          searchQuery ? (
            <Tooltip label="Clear search">
              <ActionIcon
                size="xs"
                variant="subtle"
                onClick={() => onSearchChange("")}
              >
                <X size={12} />
              </ActionIcon>
            </Tooltip>
          ) : null
        }
      />

      <Box px="xs" mt="3xs">
        <Text
          size="3xs"
          fw={700}
          c="dimmed"
          tt="uppercase"
          style={{ letterSpacing: "0.08em" }}
        >
          Categories
        </Text>
      </Box>

      <SidebarCategoryList
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
        totalModsCount={totalModsCount}
        uncategorizedCount={uncategorizedCount}
        onRenameCategory={onRenameCategory}
        onDeleteCategory={onDeleteCategory}
      />

      <Box
        pt="sm"
        style={{ borderTop: "1px solid var(--color-border-subtle)" }}
      >
        <SidebarActions
          conflicts={conflicts}
          onOpenConflicts={onOpenConflicts}
          onOpenCreateCategory={onOpenCreateCategory}
          onOpenModsFolder={onOpenModsFolder}
          onOpenManualInstall={onOpenManualInstall}
          onCheckUpdates={onCheckUpdates}
          isCheckingUpdates={isCheckingUpdates}
          onRescanMods={onRescanMods}
          isRefreshing={isRefreshing}
          hasModsDir={hasModsDir}
        />
      </Box>
    </Stack>
  );
}
