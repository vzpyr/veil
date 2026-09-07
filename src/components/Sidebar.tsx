import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconFolder,
  IconFolderFilled,
  IconFolderPlus,
  IconInbox,
  IconSearch,
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
}: SidebarProps) {
  return (
    <Stack
      w={260}
      h="100%"
      p="sm"
      gap="sm"
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
        leftSection={<IconSearch size={14} />}
        rightSection={
          searchQuery ? (
            <ActionIcon
              size="xs"
              variant="subtle"
              onClick={() => onSearchChange("")}
            >
              <IconX size={12} />
            </ActionIcon>
          ) : null
        }
      />

      <Group justify="space-between" px="xs" mt="xs">
        <Text size="xs" fw={700} c="dimmed" tt="uppercase">
          Categories
        </Text>
        <Tooltip label="Create new category">
          <ActionIcon size="xs" variant="subtle" onClick={onOpenCreateCategory}>
            <IconFolderPlus size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <ScrollArea style={{ flex: 1 }}>
        <Stack gap="2xs">
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
              <Badge size="xs" variant="light" color="gray">
                {totalModsCount}
              </Badge>
            }
            style={{ borderRadius: "var(--radius-sm)" }}
          />

          <NavLink
            label="Uncategorized"
            active={selectedCategory === "__root__"}
            onClick={() => onSelectCategory("__root__")}
            leftSection={<IconInbox size={16} />}
            rightSection={
              <Badge size="xs" variant="light" color="gray">
                {uncategorizedCount}
              </Badge>
            }
            style={{ borderRadius: "var(--radius-sm)" }}
          />

          {categories.map((cat) => (
            <NavLink
              key={cat.name}
              label={cat.name}
              active={selectedCategory === cat.name}
              onClick={() => onSelectCategory(cat.name)}
              leftSection={
                selectedCategory === cat.name ? (
                  <IconFolderFilled size={16} />
                ) : (
                  <IconFolder size={16} />
                )
              }
              rightSection={
                <Badge size="xs" variant="light" color="gray">
                  {cat.mod_count}
                </Badge>
              }
              style={{ borderRadius: "var(--radius-sm)" }}
            />
          ))}
        </Stack>
      </ScrollArea>

      <Box
        pt="xs"
        style={{ borderTop: "1px solid var(--color-border-subtle)" }}
      >
        <Button
          fullWidth
          variant="light"
          size="xs"
          leftSection={<IconFolderPlus size={14} />}
          onClick={onOpenCreateCategory}
        >
          New Category
        </Button>
      </Box>
    </Stack>
  );
}
