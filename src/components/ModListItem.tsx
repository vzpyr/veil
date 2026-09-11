import {
  ActionIcon,
  Badge,
  Box,
  Card,
  Center,
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

interface ModListItemProps {
  mod: ModItem;
  inConflict: boolean;
  updateInfo?: ModUpdateInfo;
  onToggle: (modId: string, enabled: boolean) => void;
  onMoveCategory: (mod: ModItem) => void;
  onOpenFolder: (folderPath: string) => void;
  onDelete: (mod: ModItem) => void;
  onOpenConflicts: () => void;
  onOpenKeybinds: (mod: ModItem) => void;
  onOpenGameBanana: (mod: ModItem) => void;
  onOpenLinkGameBanana: (mod: ModItem) => void;
  onSetPreview: (mod: ModItem) => void;
}

export default function ModListItem({
  mod,
  inConflict,
  updateInfo,
  onToggle,
  onMoveCategory,
  onOpenFolder,
  onDelete,
  onOpenConflicts,
  onOpenKeybinds,
  onOpenGameBanana,
  onOpenLinkGameBanana,
  onSetPreview,
}: ModListItemProps) {
  const previewUrl = mod.preview_path ? convertFileSrc(mod.preview_path) : null;

  return (
    <Card
      p="xs"
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
      <Group justify="space-between" align="center" gap="sm" wrap="nowrap">
        <Group
          gap="sm"
          align="center"
          wrap="nowrap"
          style={{ flex: 1, minWidth: 0 }}
        >
          <Box
            className="card-media"
            style={{
              width: "var(--size-thumb-list-w)",
              height: "var(--size-thumb-list-h)",
              flexShrink: 0,
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
              backgroundColor: "var(--color-bg-surface-2)",
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
              <Center h="100%" w="100%">
                <ImageIcon size={18} color="var(--color-text-muted)" />
              </Center>
            )}
          </Box>

          <Stack gap="3xs" style={{ flex: 1, minWidth: 0 }}>
            <Group gap="xs" align="center" wrap="nowrap">
              <Tooltip label={mod.name}>
                <Text fw={600} size="sm" truncate>
                  {mod.name}
                </Text>
              </Tooltip>

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
                    leftSection={<CircleArrowUp size={12} />}
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

            <Group gap="xs" align="center">
              <Badge size="xs" variant="outline" color="gray">
                {mod.hashes.length}{" "}
                {mod.hashes.length === 1 ? "hash" : "hashes"}
              </Badge>
              {mod.version && (
                <Badge size="xs" variant="subtle" color="gray">
                  v{formatVersion(mod.version)}
                </Badge>
              )}
            </Group>
          </Stack>
        </Group>

        <Group
          gap="xs"
          align="center"
          wrap="nowrap"
          onClick={(e) => e.stopPropagation()}
        >
          <Switch
            size="sm"
            checked={mod.enabled}
            onChange={(e) => onToggle(mod.id, e.currentTarget.checked)}
          />

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
                leftSection={<FolderOpen size={14} />}
                onClick={() => onOpenFolder(mod.folder_path)}
              >
                Open Folder
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
    </Card>
  );
}
