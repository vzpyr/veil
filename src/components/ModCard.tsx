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
  CircleArrowUp,
  EllipsisVertical,
  ExternalLink,
  FolderSymlink,
  ImageIcon,
  Keyboard,
  Link,
  TriangleAlert,
  Trash2,
} from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { ModItem, ModUpdateInfo } from "../types";
import { formatVersion } from "../utils";

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
  onOpenGameBanana: (mod: ModItem) => void;
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
  onOpenGameBanana,
  onOpenLinkGameBanana,
  onSetPreview,
}: ModCardProps) {
  const previewUrl = mod.preview_path ? convertFileSrc(mod.preview_path) : null;

  return (
    <Card
      p="xs"
      radius="lg"
      withBorder
      h="100%"
      className="card-interactive"
      onClick={mod.gamebanana_id ? () => onOpenGameBanana(mod) : undefined}
      style={{
        borderColor: inConflict
          ? "var(--color-status-warning)"
          : mod.enabled
            ? "var(--color-border-strong)"
            : "var(--color-border-subtle)",
      }}
    >
      <Card.Section
        className="card-media"
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
            <ImageIcon size={32} color="var(--color-text-muted)" />
            <Text size="2xs" c="dimmed">
              No preview image
            </Text>
          </Stack>
        )}

        <Group
          style={{
            position: "absolute",
            top: "var(--space-sm)",
            left: "var(--space-sm)",
            right: "var(--space-sm)",
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
                  className="animate-scale-in"
                  leftSection={<CircleArrowUp size={14} />}
                  style={{ cursor: "pointer" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenGameBanana(mod);
                  }}
                >
                  {updateInfo.latestVersion
                    ? `Update v${formatVersion(updateInfo.latestVersion)}`
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
                className="animate-scale-in"
                leftSection={<TriangleAlert size={12} />}
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

          <Group gap="3xs" wrap="nowrap" onClick={(e) => e.stopPropagation()}>
            <Tooltip label="Keybinds and toggles">
              <ActionIcon
                variant="subtle"
                size="sm"
                radius="xl"
                color="gray"
                onClick={() => onOpenKeybinds(mod)}
              >
                <Keyboard size={16} />
              </ActionIcon>
            </Tooltip>

            <Menu position="bottom-end" shadow="md" width={190} radius="lg">
              <Menu.Target>
                <Tooltip label="More options">
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    radius="xl"
                    color="gray"
                  >
                    <EllipsisVertical size={16} />
                  </ActionIcon>
                </Tooltip>
              </Menu.Target>
              <Menu.Dropdown>
                {updateInfo?.available && (
                  <Menu.Item
                    leftSection={<CircleArrowUp size={14} />}
                    color="green"
                    onClick={() => onOpenGameBanana(mod)}
                  >
                    View Update
                  </Menu.Item>
                )}
                <Menu.Item
                  leftSection={<FolderSymlink size={14} />}
                  onClick={() => onMoveCategory(mod)}
                >
                  Move Category
                </Menu.Item>
                <Menu.Item
                  leftSection={<Link size={14} />}
                  onClick={() => onOpenLinkGameBanana(mod)}
                >
                  {mod.gamebanana_id
                    ? "Edit GameBanana Link"
                    : "Link to GameBanana"}
                </Menu.Item>
                <Menu.Item
                  leftSection={<ImageIcon size={14} />}
                  onClick={() => onSetPreview(mod)}
                >
                  Set Preview Image
                </Menu.Item>
                <Menu.Item
                  leftSection={<ExternalLink size={14} />}
                  onClick={() => onReveal(mod.folder_path)}
                >
                  Reveal in Files
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<Trash2 size={14} />}
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
                v{formatVersion(mod.version)}
              </Badge>
            )}
          </Group>

          <Group gap="2xs" wrap="nowrap" onClick={(e) => e.stopPropagation()}>
            <Switch
              size="sm"
              checked={mod.enabled}
              onChange={(e) => onToggle(mod.id, e.currentTarget.checked)}
            />
          </Group>
        </Group>
      </Stack>
    </Card>
  );
}
