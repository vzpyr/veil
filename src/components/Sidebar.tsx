import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Menu,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  Archive,
  EllipsisVertical,
  Folder,
  FolderOpen,
  FolderPlus,
  PackagePlus,
  Pencil,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { CategoryItem } from "../types";
import { fadeUp, staggerContainer } from "../motion";

interface SidebarProps {
  categories: CategoryItem[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  totalModsCount: number;
  uncategorizedCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
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

      <ScrollArea style={{ flex: 1 }}>
        <motion.div
          variants={staggerContainer()}
          initial="hidden"
          animate="visible"
        >
          <Stack gap="3xs">
            <motion.div variants={fadeUp}>
              <NavLink
                label="All Mods"
                active={selectedCategory === null}
                onClick={() => onSelectCategory(null)}
                leftSection={
                  selectedCategory === null ? (
                    <Folder size={16} fill="currentColor" />
                  ) : (
                    <Folder size={16} />
                  )
                }
                rightSection={
                  <Badge
                    size="xs"
                    variant="light"
                    color="gray"
                    className="badge-count"
                  >
                    {totalModsCount}
                  </Badge>
                }
              />
            </motion.div>

            <motion.div variants={fadeUp}>
              <NavLink
                label="Uncategorized"
                active={selectedCategory === "__root__"}
                onClick={() => onSelectCategory("__root__")}
                leftSection={
                  selectedCategory === "__root__" ? (
                    <Archive size={16} fill="currentColor" />
                  ) : (
                    <Archive size={16} />
                  )
                }
                rightSection={
                  <Badge
                    size="xs"
                    variant="light"
                    color="gray"
                    className="badge-count"
                  >
                    {uncategorizedCount}
                  </Badge>
                }
              />
            </motion.div>

            {categories.map((cat) => (
              <motion.div key={cat.name} variants={fadeUp}>
                <NavLink
                  label={cat.name}
                  active={selectedCategory === cat.name}
                  onClick={() => onSelectCategory(cat.name)}
                  leftSection={
                    selectedCategory === cat.name ? (
                      <Folder size={16} fill="currentColor" />
                    ) : (
                      <Folder size={16} />
                    )
                  }
                  rightSection={
                    <Group gap="2xs" wrap="nowrap">
                      <Menu position="bottom-end" withinPortal>
                        <Menu.Target>
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="gray"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <EllipsisVertical size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<Pencil size={14} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              onRenameCategory(cat.name);
                            }}
                          >
                            Rename Category
                          </Menu.Item>
                          <Menu.Item
                            color="red"
                            leftSection={<Trash2 size={14} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteCategory(cat.name);
                            }}
                          >
                            Delete Category
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                      <Badge
                        size="xs"
                        variant="light"
                        color="gray"
                        className="badge-count"
                      >
                        {cat.mod_count}
                      </Badge>
                    </Group>
                  }
                />
              </motion.div>
            ))}
          </Stack>
        </motion.div>
      </ScrollArea>

      <Box
        pt="sm"
        style={{ borderTop: "1px solid var(--color-border-subtle)" }}
      >
        <Stack gap="xs">
          <Button
            fullWidth
            variant="default"
            size="xs"
            leftSection={<FolderPlus size={14} />}
            onClick={onOpenCreateCategory}
            disabled={!hasModsDir}
          >
            New Category
          </Button>
          <Button
            fullWidth
            variant="default"
            size="xs"
            leftSection={<FolderOpen size={14} />}
            onClick={onOpenModsFolder}
            disabled={!hasModsDir}
          >
            Open Mods Folder
          </Button>
          <Button
            fullWidth
            variant="default"
            size="xs"
            leftSection={<PackagePlus size={14} />}
            onClick={onOpenManualInstall}
            disabled={!hasModsDir}
          >
            Install Mod
          </Button>
          <Button
            fullWidth
            variant="default"
            size="xs"
            leftSection={<Sparkles size={14} />}
            onClick={onCheckUpdates}
            disabled={!hasModsDir || isCheckingUpdates}
          >
            Check Updates
          </Button>
          <Button
            fullWidth
            variant="default"
            size="xs"
            leftSection={<RefreshCw size={14} />}
            onClick={onRescanMods}
            disabled={!hasModsDir || isRefreshing}
          >
            Rescan Mods
          </Button>
        </Stack>
      </Box>
    </Stack>
  );
}
