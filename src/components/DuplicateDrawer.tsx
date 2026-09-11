import {
  Badge,
  Button,
  Drawer,
  Group,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { Copy, RefreshCw, TriangleAlert } from "lucide-react";
import { ModItem } from "../types";

interface DuplicateDrawerProps {
  opened: boolean;
  onClose: () => void;
  modName: string;
  existingMod?: ModItem;
  onConfirm: (action: "replace" | "keep_both") => void;
}

export function DuplicateDrawer({
  opened,
  onClose,
  modName,
  existingMod,
  onConfirm,
}: DuplicateDrawerProps) {
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      size="md"
      title={
        <Group gap="xs">
          <TriangleAlert size={20} color="var(--color-status-warning)" />
          <Text fw={700} size="md">
            Mod Already Installed
          </Text>
        </Group>
      }
    >
      <Stack gap="md" h="100%">
        <Text size="sm">
          A mod named{" "}
          <Text span fw={700}>
            {modName}
          </Text>{" "}
          already exists in your library.
        </Text>

        {existingMod && (
          <Paper p="xs">
            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                Existing Location
              </Text>
              <Badge size="xs" variant="outline" color="gray">
                {existingMod.category || "Uncategorized"}
              </Badge>
            </Group>
            <Text size="xs" fw={600} mt="2xs">
              {existingMod.name}
            </Text>
          </Paper>
        )}

        <Text size="xs" c="dimmed">
          Choose how you would like to handle this installation.
        </Text>

        <Stack gap="xs">
          <Button
            justify="flex-start"
            variant="default"
            h="auto"
            py="xs"
            leftSection={<RefreshCw size={18} />}
            onClick={() => {
              onConfirm("replace");
              onClose();
            }}
          >
            <Stack gap="3xs" align="flex-start">
              <Text size="sm" fw={600}>
                Replace Existing Files
              </Text>
              <Text size="2xs" c="dimmed">
                Removes obsolete files from previous version, keeps previews and
                active symlinks.
              </Text>
            </Stack>
          </Button>

          <Button
            justify="flex-start"
            variant="default"
            h="auto"
            py="xs"
            leftSection={<Copy size={18} />}
            onClick={() => {
              onConfirm("keep_both");
              onClose();
            }}
          >
            <Stack gap="3xs" align="flex-start">
              <Text size="sm" fw={600}>
                Keep Both Versions
              </Text>
              <Text size="2xs" c="dimmed">
                Installs alongside the existing mod as a numbered copy.
              </Text>
            </Stack>
          </Button>
        </Stack>

        <Group justify="flex-end" mt="auto">
          <Button variant="default" size="xs" onClick={onClose}>
            Cancel
          </Button>
        </Group>
      </Stack>
    </Drawer>
  );
}
