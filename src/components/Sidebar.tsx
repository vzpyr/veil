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
} from "@mantine/core";
import {
  IconArchive,
  IconArchiveFilled,
  IconDotsVertical,
  IconEdit,
  IconFolder,
  IconFolderFilled,
  IconFolderOpen,
  IconFolderPlus,
  IconPackageImport,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { CategoryItem } from "../types";

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
  hasModsDir,
}: SidebarProps) {
  return (
    <Stack
      w="var(--sidebar-width)"
      h="100%"
      p="xs"
      gap="xs"
      style={{
        backgroundColor: "var(--color-bg-surface-1)",
        borderRight: "1px solid var(--color-border-subtle)",
      }}
    >
      <TextInput
        size="xs"
        radius="xl"
        placeholder="Filter mods..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.currentTarget.value)}
        leftSection={<IconSearch size={14} />}
        rightSection={
          searchQuery ? (
            <ActionIcon
              size="xs"
              radius="xl"
              variant="subtle"
              onClick={() => onSearchChange("")}
            >
              <IconX size={12} />
            </ActionIcon>
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
        <Stack gap="3xs">
          <NavLink
            label="All Mods"
            active={selectedCategory === null}
            onClick={() => onSelectCategory(null)}
            leftSection={
              selectedCategory === null ? (
                <IconFolderFilled size={16} />
              ) : (
                <IconFolder size={16} />
              )
            }
            rightSection={
              <Badge size="xs" radius="xl" variant="light" color="gray">
                {totalModsCount}
              </Badge>
            }
          />

          <NavLink
            label="Uncategorized"
            active={selectedCategory === "__root__"}
            onClick={() => onSelectCategory("__root__")}
            leftSection={
              selectedCategory === "__root__" ? (
                <IconArchiveFilled size={16} />
              ) : (
                <IconArchive size={16} />
              )
            }
            rightSection={
              <Badge size="xs" radius="xl" variant="light" color="gray">
                {uncategorizedCount}
              </Badge>
            }
          />

          {categories.map((cat) => (
            <NavLink
              key={cat.name}
              label={cat.name}
              active={selectedCategory === cat.name}
              onClick={() => onSelectCategory(cat.name)}
              leftSection={
                selectedCategory === cat.name ? (
                  <IconArchiveFilled size={16} />
                ) : (
                  <IconArchive size={16} />
                )
              }
              rightSection={
                <Group gap="2xs" wrap="nowrap">
                  <Badge size="xs" radius="xl" variant="light" color="gray">
                    {cat.mod_count}
                  </Badge>
                  <Menu position="bottom-end" withinPortal radius="lg">
                    <Menu.Target>
                      <ActionIcon
                        size="xs"
                        radius="xl"
                        variant="subtle"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <IconDotsVertical size={12} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconEdit size={14} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRenameCategory(cat.name);
                        }}
                      >
                        Rename Category
                      </Menu.Item>
                      <Menu.Item
                        color="red"
                        className="menu-item-danger"
                        leftSection={<IconTrash size={14} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCategory(cat.name);
                        }}
                      >
                        Delete Category
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              }
            />
          ))}
        </Stack>
      </ScrollArea>

      <Box
        pt="xs"
        style={{ borderTop: "1px solid var(--color-border-subtle)" }}
      >
        <Stack gap="xs">
          <Button
            fullWidth
            variant="default"
            size="xs"
            radius="xl"
            leftSection={<IconFolderPlus size={14} />}
            onClick={onOpenCreateCategory}
          >
            New Category
          </Button>
          <Button
            fullWidth
            variant="default"
            size="xs"
            radius="xl"
            leftSection={<IconFolderOpen size={14} />}
            onClick={onOpenModsFolder}
            disabled={!hasModsDir}
          >
            Open Mods Folder
          </Button>
          <Button
            fullWidth
            variant="default"
            size="xs"
            radius="xl"
            leftSection={<IconPackageImport size={14} />}
            onClick={onOpenManualInstall}
          >
            Install Mod
          </Button>
        </Stack>
      </Box>
    </Stack>
  );
}
