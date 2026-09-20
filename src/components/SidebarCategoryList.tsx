import {
  ActionIcon,
  Badge,
  Group,
  Menu,
  NavLink,
  ScrollArea,
  Stack,
} from "@mantine/core";
import {
  Archive,
  EllipsisVertical,
  Folder,
  Pencil,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { CategoryItem } from "../types";
import { fadeUp, staggerContainer } from "../motion";

interface SidebarCategoryListProps {
  categories: CategoryItem[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  totalModsCount: number;
  uncategorizedCount: number;
  onRenameCategory: (categoryName: string) => void;
  onDeleteCategory: (categoryName: string) => void;
}

function CountBadge({ children }: { children: ReactNode }) {
  return (
    <Badge size="xs" variant="light" color="gray" className="badge-count">
      {children}
    </Badge>
  );
}

interface CategoryNavLinkProps {
  label: string;
  active: boolean;
  onSelect: () => void;
  icon: ReactNode;
  count: number;
}

function CategoryNavLink({
  label,
  active,
  onSelect,
  icon,
  count,
}: CategoryNavLinkProps) {
  return (
    <motion.div variants={fadeUp}>
      <NavLink
        label={label}
        active={active}
        onClick={onSelect}
        leftSection={icon}
        rightSection={<CountBadge>{count}</CountBadge>}
      />
    </motion.div>
  );
}

export default function SidebarCategoryList({
  categories,
  selectedCategory,
  onSelectCategory,
  totalModsCount,
  uncategorizedCount,
  onRenameCategory,
  onDeleteCategory,
}: SidebarCategoryListProps) {
  return (
    <ScrollArea style={{ flex: 1 }}>
      <motion.div
        variants={staggerContainer()}
        initial="hidden"
        animate="visible"
      >
        <Stack gap="3xs">
          <CategoryNavLink
            label="All mods"
            active={selectedCategory === null}
            onSelect={() => onSelectCategory(null)}
            icon={
              <Folder
                size={16}
                fill={selectedCategory === null ? "currentColor" : undefined}
              />
            }
            count={totalModsCount}
          />

          <CategoryNavLink
            label="Uncategorized"
            active={selectedCategory === "__root__"}
            onSelect={() => onSelectCategory("__root__")}
            icon={
              <Archive
                size={16}
                fill={
                  selectedCategory === "__root__" ? "currentColor" : undefined
                }
              />
            }
            count={uncategorizedCount}
          />

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
                          Rename category
                        </Menu.Item>
                        <Menu.Item
                          color="red"
                          leftSection={<Trash2 size={14} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteCategory(cat.name);
                          }}
                        >
                          Delete category
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                    <CountBadge>{cat.mod_count}</CountBadge>
                  </Group>
                }
              />
            </motion.div>
          ))}
        </Stack>
      </motion.div>
    </ScrollArea>
  );
}
