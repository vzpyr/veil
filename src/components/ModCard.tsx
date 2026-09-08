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
  IconArrowBadgeUp,
  IconDotsVertical,
  IconExternalLink,
  IconFolderSymlink,
  IconKeyboard,
  IconLink,
  IconPhoto,
  IconTrash,
} from "@tabler/icons-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { ModItem, ModUpdateInfo } from "../types";

interface ModCardProps {
  mod: ModItem;
  inConflict: boolean;
  updateInfo?: ModUpdateInfo;
  onToggle: (modId: string, enabled: boolean) => void;
  onMoveCategory: (mod: ModItem) => void;
  onReveal: (folderPath: string) => void;
  onDelete: (mod: ModItem) => void;
  onOpenConflicts: () => void;
  onOpenKeybinds: (mod: ModItem) => void;
  onOpenUpdate: (mod: ModItem, updateInfo: ModUpdateInfo) => void;
  onOpenLinkGameBanana: (mod: ModItem) => void;
  onSetPreview: (mod: ModItem) => void;
}

export default function ModCard({
  mod,
  inConflict,
  updateInfo,
  onToggle,
  onMoveCategory,
  onReveal,
  onDelete,
  onOpenConflicts,
  onOpenKeybinds,
  onOpenUpdate,
  onOpenLinkGameBanana,
  onSetPreview,
}: ModCardProps) {
  const previewUrl = mod.preview_path ? convertFileSrc(mod.preview_path) : null;

  return (
    <Card
      p="xs"
      radius="lg"
      withBorder
      className="card-interactive"
      style={{
        borderColor: inConflict
          ? "var(--color-status-warning)"
          : mod.enabled
            ? "var(--color-border-strong)"
            : "var(--color-border-subtle)",
      }}
    >
      <Card.Section
        style={{
          position: "relative",
          aspectRatio: "16 / 9",
          backgroundColor: "var(--color-bg-surface-2)",
          borderTopLeftRadius: "var(--radius-lg)",
          borderTopRightRadius: "var(--radius-lg)",
          overflow: "hidden",
        }}
      >
        {previewUrl ? (
          <Image
            src={previewUrl}
            h="100%"
            w="100%"
            fit="cover"
            alt={mod.name}
          />
        ) : (
          <Stack h="100%" align="center" justify="center" gap="xs">
            <IconPhoto size={32} color="var(--color-text-muted)" />
            <Text size="2xs" c="dimmed">
              No preview image
            </Text>
          </Stack>
        )}

        <Group
          style={{
            position: "absolute",
            top: "var(--space-xs)",
            left: "var(--space-xs)",
            right: "var(--space-xs)",
            justifyContent: "space-between",
          }}
        >
          <Group gap="2xs">
            {mod.category && (
              <Badge size="xs" radius="xl" variant="filled" color="dark">
                {mod.category}
              </Badge>
            )}
            {updateInfo?.available && (
              <Tooltip label="Update available on GameBanana. Click to view release.">
                <Badge
                  size="xs"
                  radius="xl"
                  color="green"
                  variant="filled"
                  leftSection={<IconArrowBadgeUp size={14} />}
                  style={{ cursor: "pointer" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenUpdate(mod, updateInfo);
                  }}
                >
                  {updateInfo.latestVersion
                    ? `Update v${updateInfo.latestVersion}`
                    : "Update"}
                </Badge>
              </Tooltip>
            )}
          </Group>

          {inConflict && (
            <Tooltip label="Active hash conflict detected. Click to resolve.">
              <Badge
                size="xs"
                radius="xl"
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

      <Stack gap="xs" mt="xs">
        <Group justify="space-between" wrap="nowrap">
          <Tooltip label={mod.name}>
            <Text fw={600} size="sm" truncate>
              {mod.name}
            </Text>
          </Tooltip>

          <Group gap="3xs" wrap="nowrap">
            <Tooltip label="Keybinds and toggles">
              <ActionIcon
                variant="subtle"
                size="sm"
                radius="xl"
                color="gray"
                onClick={() => onOpenKeybinds(mod)}
              >
                <IconKeyboard size={16} />
              </ActionIcon>
            </Tooltip>

            <Menu position="bottom-end" shadow="md" width={190} radius="lg">
              <Menu.Target>
                <ActionIcon variant="subtle" size="sm" radius="xl" color="gray">
                  <IconDotsVertical size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                {updateInfo?.available && (
                  <Menu.Item
                    className="menu-item-success"
                    leftSection={<IconArrowBadgeUp size={14} />}
                    color="green"
                    onClick={() => onOpenUpdate(mod, updateInfo)}
                  >
                    View Update
                  </Menu.Item>
                )}
                <Menu.Item
                  leftSection={<IconKeyboard size={14} />}
                  onClick={() => onOpenKeybinds(mod)}
                >
                  Keybinds and toggles
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconFolderSymlink size={14} />}
                  onClick={() => onMoveCategory(mod)}
                >
                  Move Category
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconLink size={14} />}
                  onClick={() => onOpenLinkGameBanana(mod)}
                >
                  {mod.gamebanana_id
                    ? "Edit GameBanana Link"
                    : "Link to GameBanana"}
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconPhoto size={14} />}
                  onClick={() => onSetPreview(mod)}
                >
                  Set Preview Image
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
                  className="menu-item-danger"
                  leftSection={<IconTrash size={14} />}
                  onClick={() => onDelete(mod)}
                >
                  Delete Mod
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>

        <Group justify="space-between" align="center">
          <Group gap="2xs">
            <Badge size="xs" radius="xl" variant="outline" color="gray">
              {mod.hashes.length} {mod.hashes.length === 1 ? "hash" : "hashes"}
            </Badge>
            {mod.version && (
              <Badge size="xs" radius="xl" variant="subtle" color="gray">
                v{mod.version}
              </Badge>
            )}
          </Group>

          <Switch
            size="sm"
            checked={mod.enabled}
            onChange={(e) => onToggle(mod.id, e.currentTarget.checked)}
          />
        </Group>
      </Stack>
    </Card>
  );
}
