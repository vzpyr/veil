import { ActionIcon, Badge, Box, Button, Card, Group } from "@mantine/core";
import { FolderSymlink, Power, PowerOff, Trash2, X } from "lucide-react";

interface ModBatchBarProps {
  selectedCount: number;
  allVisibleSelected: boolean;
  isTogglingBatch: boolean;
  onToggleSelectAll: () => void;
  onEnable: () => void;
  onDisable: () => void;
  onMove: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function ModBatchBar({
  selectedCount,
  allVisibleSelected,
  isTogglingBatch,
  onToggleSelectAll,
  onEnable,
  onDisable,
  onMove,
  onDelete,
  onClose,
}: ModBatchBarProps) {
  return (
    <Box
      style={{
        position: "fixed",
        bottom: "var(--space-lg)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: "var(--z-index-floating-bar)",
        maxWidth: "var(--max-width-floating-bar)",
        width: "calc(100% - var(--space-2xl))",
      }}
    >
      <Card
        p="xs"
        style={{
          backgroundColor: "var(--color-bg-surface-3)",
          borderColor: "var(--color-border-strong)",
          boxShadow: "var(--shadow-lg)",
          borderRadius: "var(--radius-pill)",
        }}
        className="animate-fade-in-up"
      >
        <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <Badge
              variant="filled"
              color={selectedCount > 0 ? "gray" : "dark"}
              size="sm"
            >
              {selectedCount}{" "}
              {selectedCount === 1 ? "mod selected" : "mods selected"}
            </Badge>
            <Button
              variant="subtle"
              size="xs"
              color="gray"
              onClick={onToggleSelectAll}
            >
              {allVisibleSelected ? "Deselect All" : "Select All"}
            </Button>
          </Group>

          <Group gap="2xs" wrap="nowrap">
            <Button
              variant="default"
              size="xs"
              leftSection={
                <Power size={14} color="var(--color-status-success)" />
              }
              disabled={selectedCount === 0 || isTogglingBatch}
              loading={isTogglingBatch}
              onClick={onEnable}
            >
              Enable
            </Button>
            <Button
              variant="default"
              size="xs"
              leftSection={
                <PowerOff size={14} color="var(--color-status-warning)" />
              }
              disabled={selectedCount === 0 || isTogglingBatch}
              loading={isTogglingBatch}
              onClick={onDisable}
            >
              Disable
            </Button>
            <Button
              variant="default"
              size="xs"
              leftSection={<FolderSymlink size={14} />}
              disabled={selectedCount === 0}
              onClick={onMove}
            >
              Move
            </Button>
            <Button
              variant="filled"
              color="red"
              size="xs"
              leftSection={<Trash2 size={14} />}
              disabled={selectedCount === 0}
              onClick={onDelete}
            >
              Delete
            </Button>
            <ActionIcon
              variant="subtle"
              size="sm"
              color="gray"
              onClick={onClose}
            >
              <X size={14} />
            </ActionIcon>
          </Group>
        </Group>
      </Card>
    </Box>
  );
}
