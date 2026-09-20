import {
  Button,
  Drawer,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import { Trash2 } from "lucide-react";
import type { ModItem } from "../types";

interface ModBatchDeleteDrawerProps {
  opened: boolean;
  mods: ModItem[];
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ModBatchDeleteDrawer({
  opened,
  mods,
  isDeleting,
  onClose,
  onConfirm,
}: ModBatchDeleteDrawerProps) {
  return (
    <Drawer
      opened={opened}
      onClose={() => !isDeleting && onClose()}
      size="md"
      title={
        <Group gap="xs">
          <Trash2 size={20} color="var(--color-status-error)" />
          <Text fw={700} size="md">
            Delete Selected Mods
          </Text>
        </Group>
      }
    >
      <Stack gap="md" h="100%">
        <Text size="sm">
          Are you sure you want to permanently delete {mods.length}{" "}
          {mods.length === 1 ? "mod" : "mods"} from disk? This action cannot be
          undone.
        </Text>
        <ScrollArea style={{ flex: 1 }}>
          <Stack gap="2xs">
            {mods.map((m) => (
              <Paper key={m.id} p="xs">
                <Text size="xs" fw={600} truncate>
                  {m.name}
                </Text>
                {m.category && (
                  <Text size="2xs" c="dimmed">
                    Category: {m.category}
                  </Text>
                )}
              </Paper>
            ))}
          </Stack>
        </ScrollArea>
        <Group justify="flex-end" gap="xs" mt="auto">
          <Button
            variant="default"
            size="xs"
            disabled={isDeleting}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="filled"
            color="red"
            size="xs"
            loading={isDeleting}
            onClick={onConfirm}
          >
            Delete
          </Button>
        </Group>
      </Stack>
    </Drawer>
  );
}
