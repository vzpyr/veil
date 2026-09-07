import {
  Drawer,
  Stack,
  Group,
  Text,
  Badge,
  Button,
  ActionIcon,
  Progress,
  Paper,
  Image,
  ScrollArea,
} from "@mantine/core";
import {
  IconDownload,
  IconX,
  IconCheck,
  IconAlertCircle,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import { DownloadQueueItem } from "../types";

interface DownloadQueueDrawerProps {
  opened: boolean;
  onClose: () => void;
  queue: DownloadQueueItem[];
  onClearCompleted: () => void;
  onCancelItem: (id: string) => void;
  onRetryItem: (id: string) => void;
}

export function DownloadQueueDrawer({
  opened,
  onClose,
  queue,
  onClearCompleted,
  onCancelItem,
  onRetryItem,
}: DownloadQueueDrawerProps) {
  const activeCount = queue.filter(
    (item) =>
      item.status === "downloading" ||
      item.status === "extracting" ||
      item.status === "queued",
  ).length;

  const completedCount = queue.filter(
    (item) => item.status === "completed",
  ).length;

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="md"
      title={
        <Group justify="space-between" style={{ width: "100%" }} pr="xs">
          <Group gap="xs">
            <IconDownload size={18} color="var(--color-accent)" />
            <Text fw={700} size="md">
              Download Queue
            </Text>
            {activeCount > 0 && (
              <Badge size="xs" variant="filled" color="blue">
                {activeCount}
              </Badge>
            )}
          </Group>
          {completedCount > 0 && (
            <Button
              variant="subtle"
              color="gray"
              size="2xs"
              leftSection={<IconTrash size={12} />}
              onClick={onClearCompleted}
            >
              Clear Completed
            </Button>
          )}
        </Group>
      }
    >
      <ScrollArea h="calc(100vh - 100px)" offsetScrollbars>
        <Stack gap="xs" pr="xs">
          {queue.length === 0 ? (
            <Stack align="center" justify="center" py="xl" gap="xs">
              <IconDownload size={36} color="var(--color-text-dimmed)" />
              <Text c="dimmed" size="sm" ta="center">
                No active or queued downloads.
              </Text>
            </Stack>
          ) : (
            queue.map((item) => {
              const isDownloading = item.status === "downloading";
              const isExtracting = item.status === "extracting";
              const isQueued = item.status === "queued";
              const isCompleted = item.status === "completed";
              const isFailed = item.status === "failed";

              return (
                <Paper
                  key={item.id}
                  p="xs"
                  radius="sm"
                  style={{
                    backgroundColor: "var(--color-surface-subtle)",
                    border: "1px solid var(--color-border-subtle)",
                  }}
                >
                  <Group
                    justify="space-between"
                    align="flex-start"
                    wrap="nowrap"
                  >
                    <Group
                      gap="xs"
                      wrap="nowrap"
                      style={{ flex: 1, minWidth: 0 }}
                    >
                      {item.previewUrl ? (
                        <Image
                          src={item.previewUrl}
                          w={44}
                          h={44}
                          radius="xs"
                          fit="cover"
                          fallbackSrc="https://placehold.co/44x44/1a1a1a/666666?text=Mod"
                        />
                      ) : (
                        <Paper
                          w={44}
                          h={44}
                          radius="xs"
                          style={{
                            backgroundColor: "var(--color-surface-hover)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <IconDownload
                            size={20}
                            color="var(--color-text-dimmed)"
                          />
                        </Paper>
                      )}

                      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                        <Text size="xs" fw={700} truncate>
                          {item.modName}
                        </Text>
                        <Text size="2xs" c="dimmed" truncate>
                          {item.fileName}
                        </Text>
                      </Stack>
                    </Group>

                    <Group gap={6} align="center">
                      {isQueued && (
                        <Badge size="xs" variant="light" color="yellow">
                          Queued
                        </Badge>
                      )}
                      {isDownloading && (
                        <Badge size="xs" variant="light" color="blue">
                          Downloading
                        </Badge>
                      )}
                      {isExtracting && (
                        <Badge size="xs" variant="light" color="cyan">
                          Extracting
                        </Badge>
                      )}
                      {isCompleted && (
                        <Badge
                          size="xs"
                          variant="light"
                          color="green"
                          leftSection={<IconCheck size={10} />}
                        >
                          Completed
                        </Badge>
                      )}
                      {isFailed && (
                        <Badge
                          size="xs"
                          variant="light"
                          color="red"
                          leftSection={<IconAlertCircle size={10} />}
                        >
                          Failed
                        </Badge>
                      )}

                      {isFailed ? (
                        <ActionIcon
                          size="xs"
                          variant="subtle"
                          color="blue"
                          onClick={() => onRetryItem(item.id)}
                        >
                          <IconRefresh size={14} />
                        </ActionIcon>
                      ) : (
                        <ActionIcon
                          size="xs"
                          variant="subtle"
                          color="gray"
                          onClick={() => onCancelItem(item.id)}
                        >
                          <IconX size={14} />
                        </ActionIcon>
                      )}
                    </Group>
                  </Group>

                  {isDownloading && (
                    <Stack gap={4} mt="xs">
                      <Progress
                        value={item.progress.percentage}
                        size="xs"
                        animated
                        color="blue"
                        radius="xs"
                      />
                      <Group justify="space-between">
                        <Text size="2xs" c="dimmed">
                          {item.progress.speed}
                        </Text>
                        <Text size="2xs" c="dimmed">
                          {Math.round(item.progress.percentage)}% • ETA:{" "}
                          {item.progress.eta}
                        </Text>
                      </Group>
                    </Stack>
                  )}

                  {isExtracting && (
                    <Stack gap={4} mt="xs">
                      <Progress
                        value={100}
                        size="xs"
                        animated
                        color="cyan"
                        radius="xs"
                      />
                      <Text size="2xs" c="cyan" ta="right">
                        Extracting and installing archive...
                      </Text>
                    </Stack>
                  )}

                  {isFailed && item.error && (
                    <Text size="2xs" c="red" mt="xs">
                      {item.error}
                    </Text>
                  )}
                </Paper>
              );
            })
          )}
        </Stack>
      </ScrollArea>
    </Drawer>
  );
}
