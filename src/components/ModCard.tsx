import {
  ActionIcon,
  Badge,
  Card,
  Group,
  Image,
  Menu,
  Stack,
  Switch,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconDotsVertical,
  IconExternalLink,
  IconFolderSymlink,
  IconPhoto,
  IconTrash,
} from "@tabler/icons-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { ModItem } from "../types";

interface ModCardProps {
  mod: ModItem;
  inConflict: boolean;
  onToggle: (modId: string, enabled: boolean) => void;
  onMoveCategory: (mod: ModItem) => void;
  onReveal: (folderPath: string) => void;
  onDelete: (mod: ModItem) => void;
  onOpenConflicts: () => void;
}

export default function ModCard({
  mod,
  inConflict,
  onToggle,
  onMoveCategory,
  onReveal,
  onDelete,
  onOpenConflicts,
}: ModCardProps) {
  const previewUrl = mod.preview_path ? convertFileSrc(mod.preview_path) : null;

  return (
    <Card
      p="sm"
      radius="md"
      withBorder
      style={{
        backgroundColor: "var(--color-bg-card)",
        borderColor: inConflict
          ? "var(--color-status-warning)"
          : mod.enabled
            ? "var(--color-accent-primary)"
            : "var(--color-border-subtle)",
        transition: "var(--transition-fast)",
      }}
    >
      <Card.Section
        style={{
          position: "relative",
          height: 160,
          backgroundColor: "var(--color-bg-surface-2)",
        }}
      >
        {previewUrl ? (
          <Image src={previewUrl} h={160} fit="cover" alt={mod.name} />
        ) : (
          <Stack h="100%" align="center" justify="center" gap="xs">
            <IconPhoto size={36} color="var(--color-text-muted)" />
            <Text size="xs" c="dimmed">
              No preview image
            </Text>
          </Stack>
        )}

        <Group
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            right: 8,
            justifyContent: "space-between",
          }}
        >
          {mod.category ? (
            <Badge size="xs" variant="filled" color="dark">
              {mod.category}
            </Badge>
          ) : (
            <span />
          )}

          {inConflict && (
            <Tooltip label="Active hash conflict detected. Click to resolve.">
              <Badge
                size="xs"
                color="orange"
                variant="filled"
                leftSection={<IconAlertTriangle size={12} />}
                style={{ cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenConflicts();
                }}
              >
                Conflict
              </Badge>
            </Tooltip>
          )}
        </Group>
      </Card.Section>

      <Stack gap="xs" mt="sm">
        <Group justify="space-between" wrap="nowrap">
          <Tooltip label={mod.name}>
            <Text fw={600} size="sm" truncate>
              {mod.name}
            </Text>
          </Tooltip>

          <Menu position="bottom-end" shadow="md" width={180}>
            <Menu.Target>
              <ActionIcon variant="subtle" size="sm" color="gray">
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconFolderSymlink size={14} />}
                onClick={() => onMoveCategory(mod)}
              >
                Move Category
              </Menu.Item>
              <Menu.Item
                leftSection={<IconExternalLink size={14} />}
                onClick={() => onReveal(mod.folder_path)}
              >
                Reveal in Files
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                color="red"
                leftSection={<IconTrash size={14} />}
                onClick={() => onDelete(mod)}
              >
                Delete Mod
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>

        <Group justify="space-between" align="center">
          <Badge size="xs" variant="outline" color="gray">
            {mod.hashes.length} {mod.hashes.length === 1 ? "hash" : "hashes"}
          </Badge>

          <Switch
            size="sm"
            checked={mod.enabled}
            onChange={(e) => onToggle(mod.id, e.currentTarget.checked)}
            color="blue"
          />
        </Group>
      </Stack>
    </Card>
  );
}
