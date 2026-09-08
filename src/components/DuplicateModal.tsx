import { Badge, Button, Group, Modal, Paper, Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconCopy, IconRefresh } from "@tabler/icons-react";
import { ModItem } from "../types";

interface DuplicateModalProps {
  opened: boolean;
  onClose: () => void;
  modName: string;
  existingMod?: ModItem;
  onConfirm: (action: "replace" | "keep_both") => void;
}

export function DuplicateModal({
  opened,
  onClose,
  modName,
  existingMod,
  onConfirm,
}: DuplicateModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconAlertTriangle size={20} color="var(--color-status-warning)" />
          <Text fw={700} size="md">
            Mod Already Installed
          </Text>
        </Group>
      }
      radius="lg"
      size="md"
    >
      <Stack gap="md">
        <Text size="sm">
          A mod named{" "}
          <Text span fw={700}>
            {modName}
          </Text>{" "}
          already exists in your library.
        </Text>

        {existingMod && (
          <Paper p="xs" radius="md">
            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                Existing Location
              </Text>
              <Badge size="xs" radius="xl" variant="outline" color="gray">
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
            variant="light"
            color="gray"
            radius="lg"
            h="auto"
            py="xs"
            leftSection={<IconRefresh size={18} />}
            onClick={() => {
              onConfirm("replace");
              onClose();
            }}
          >
            <Stack gap="3xs" align="flex-start">
              <Text size="sm" fw={600}>
                Clean Update (Replace)
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
            radius="lg"
            h="auto"
            py="xs"
            leftSection={<IconCopy size={18} />}
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

        <Group justify="flex-end" mt="xs">
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            radius="xl"
            onClick={onClose}
          >
            Cancel
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
