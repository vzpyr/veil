import {
  ActionIcon,
  Badge,
  Card,
  Checkbox,
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
  FolderOpen,
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
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (modId: string) => void;
  onToggle: (modId: string, enabled: boolean) => void;
  onMoveCategory: (mod: ModItem) => void;
  onOpenFolder: (folderPath: string) => void;
  onDelete: (mod: ModItem) => void;
  onOpenConflicts: () => void;
  onOpenKeybinds: (mod: ModItem) => void;
  onOpenGameBanana: (mod: ModItem) => void;
  onOpenLinkGameBanana: (mod: ModItem) => void;
  onSetPreview: (mod: ModItem) => void;
  isNtePak?: boolean;
}

export default function ModCard({
  mod,
  inConflict,
  updateInfo,
  isSelectMode,
  isSelected,
  onToggleSelect,
  onToggle,
  onMoveCategory,
  onOpenFolder,
  onDelete,
  onOpenConflicts,
  onOpenKeybinds,
  onOpenGameBanana,
  onOpenLinkGameBanana,
  onSetPreview,
  isNtePak = false,
}: ModCardProps) {
  const previewUrl = mod.preview_path ? convertFileSrc(mod.preview_path) : null;

  return (
    <Card
      p="xs"
      h="100%"
      className="card-interactive"
      onClick={
        isSelectMode
          ? () => onToggleSelect?.(mod.id)
          : mod.gamebanana_id
            ? () => onOpenGameBanana(mod)
            : undefined
      }
      style={{
        borderColor: isSelected
          ? "var(--color-accent-primary)"
          : inConflict
            ? "var(--color-status-warning)"
            : mod.enabled
              ? "var(--color-border-strong)"
              : "var(--color-border-subtle)",
        backgroundColor: isSelected ? "var(--color-bg-card-active)" : undefined,
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
            {isSelectMode && (
              <Checkbox
                checked={isSelected}
                onChange={() => onToggleSelect?.(mod.id)}
                onClick={(e) => e.stopPropagation()}
                color="gray"
                size="xs"
              />
            )}
            {mod.category && (
              <Badge size="xs" variant="filled" color="dark">
                {mod.category}
              </Badge>
            )}
            {updateInfo?.available && (
              <Tooltip label="Update available on GameBanana. Click to view release.">
                <Badge
                  size="xs"
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
            {!isNtePak && (
              <Tooltip label="Keybinds and toggles">
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  color="gray"
                  onClick={() => onOpenKeybinds(mod)}
                >
                  <Keyboard size={16} />
                </ActionIcon>
              </Tooltip>
            )}

            <Menu position="bottom-end" shadow="md" width={190}>
              <Menu.Target>
                <Tooltip label="More options">
                  <ActionIcon variant="subtle" size="sm" color="gray">
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
                    View update
                  </Menu.Item>
                )}
                <Menu.Item
                  leftSection={<FolderSymlink size={14} />}
                  onClick={() => onMoveCategory(mod)}
                >
                  Move category
                </Menu.Item>
                <Menu.Item
                  leftSection={<Link size={14} />}
                  onClick={() => onOpenLinkGameBanana(mod)}
                >
                  {mod.gamebanana_id
                    ? "Edit GameBanana link"
                    : "Link to GameBanana"}
                </Menu.Item>
                <Menu.Item
                  leftSection={<ImageIcon size={14} />}
                  onClick={() => onSetPreview(mod)}
                >
                  Set preview image
                </Menu.Item>
                <Menu.Item
                  leftSection={<FolderOpen size={14} />}
                  onClick={() => onOpenFolder(mod.folder_path)}
                >
                  Open folder
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<Trash2 size={14} />}
                  onClick={() => onDelete(mod)}
                >
                  Delete mod
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>

        <Group justify="space-between" align="center">
          <Group gap="2xs">
            {!isNtePak && (
              <Badge size="xs" variant="outline" color="gray">
                {mod.hashes.length}{" "}
                {mod.hashes.length === 1 ? "hash" : "hashes"}
              </Badge>
            )}
            {mod.version && (
              <Badge size="xs" variant="subtle" color="gray">
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
