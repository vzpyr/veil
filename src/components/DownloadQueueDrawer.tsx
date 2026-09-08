import {
  ActionIcon,
  Badge,
  Button,
  Center,
  Drawer,
  Group,
  Image,
  Paper,
  Progress,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconCheck,
  IconDownload,
  IconPhoto,
  IconRefresh,
  IconTrash,
  IconX,
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
      radius="lg"
      title={
        <Group justify="space-between" style={{ width: "100%" }} pr="xs">
          <Group gap="xs">
            <IconDownload size={20} color="var(--color-accent-primary)" />
            <Text fw={700} size="md">
              Download Queue
            </Text>
            {activeCount > 0 && (
              <Badge size="xs" radius="xl" variant="filled" color="dark">
                {activeCount}
              </Badge>
            )}
          </Group>
          {completedCount > 0 && (
            <Button
              variant="default"
              size="xs"
              radius="xl"
              leftSection={<IconTrash size={12} />}
              onClick={onClearCompleted}
            >
              Clear Completed
            </Button>
          )}
        </Group>
      }
    >
      <Stack gap="sm" h="100%">
        {queue.length === 0 ? (
          <Center py="2xl">
            <Stack align="center" gap="sm">
              <IconDownload size={44} color="var(--color-text-muted)" />
              <Text fw={600} size="md">
                No Downloads in Queue
              </Text>
              <Text c="dimmed" size="xs" ta="center">
                No active or queued downloads
              </Text>
            </Stack>
          </Center>
        ) : (
          <ScrollArea style={{ flex: 1 }}>
            <Stack gap="xs" pr="xs">
              {queue.map((item) => {
                const isDownloading = item.status === "downloading";
                const isExtracting = item.status === "extracting";
                const isQueued = item.status === "queued";
                const isCompleted = item.status === "completed";
                const isFailed = item.status === "failed";

                return (
                  <Paper key={item.id} p="xs" radius="md">
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
                            w="var(--size-thumb-sm)"
                            h="var(--size-thumb-sm)"
                            radius="md"
                            fit="cover"
                          />
                        ) : (
                          <Paper
                            w="var(--size-thumb-sm)"
                            h="var(--size-thumb-sm)"
                            radius="md"
                            style={{
                              backgroundColor: "var(--color-bg-surface-3)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <IconPhoto
                              size={20}
                              color="var(--color-text-muted)"
                            />
                          </Paper>
                        )}

                        <Stack gap="3xs" style={{ flex: 1, minWidth: 0 }}>
                          <Text size="xs" fw={700} truncate>
                            {item.modName}
                          </Text>
                          <Text size="2xs" c="dimmed" truncate>
                            {item.fileName}
                          </Text>
                        </Stack>
                      </Group>

                      <Group gap="xs" align="center">
                        {isQueued && (
                          <Badge
                            size="xs"
                            radius="xl"
                            variant="light"
                            color="yellow"
                          >
                            Queued
                          </Badge>
                        )}
                        {isDownloading && (
                          <Badge
                            size="xs"
                            radius="xl"
                            variant="light"
                            color="gray"
                          >
                            Downloading
                          </Badge>
                        )}
                        {isExtracting && (
                          <Badge
                            size="xs"
                            radius="xl"
                            variant="light"
                            color="gray"
                          >
                            Extracting
                          </Badge>
                        )}
                        {isCompleted && (
                          <Badge
                            size="xs"
                            radius="xl"
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
                            radius="xl"
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
                            radius="xl"
                            variant="subtle"
                            color="gray"
                            onClick={() => onRetryItem(item.id)}
                          >
                            <IconRefresh size={14} />
                          </ActionIcon>
                        ) : (
                          <ActionIcon
                            size="xs"
                            radius="xl"
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
                      <Stack gap="2xs" mt="xs">
                        <Progress
                          value={item.progress.percentage}
                          size="xs"
                          animated
                          color="gray"
                          radius="xl"
                        />
                        <Group justify="space-between">
                          <Text size="2xs" c="dimmed">
                            {item.progress.speed}
                          </Text>
                          <Text size="2xs" c="dimmed">
                            {Math.round(item.progress.percentage)}% | ETA:{" "}
                            {item.progress.eta}
                          </Text>
                        </Group>
                      </Stack>
                    )}

                    {isExtracting && (
                      <Stack gap="2xs" mt="xs">
                        <Progress
                          value={100}
                          size="xs"
                          animated
                          color="gray"
                          radius="xl"
                        />
                        <Text size="2xs" c="dimmed" ta="right">
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
              })}
            </Stack>
          </ScrollArea>
        )}
      </Stack>
    </Drawer>
  );
}
