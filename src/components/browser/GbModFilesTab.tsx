import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  Progress,
  Stack,
  Text,
} from "@mantine/core";
import { Check, Download } from "lucide-react";
import { GbModFile, GbModProfile } from "../../api/gamebanana";
import { DownloadQueueItem } from "../../types";
import { formatVersion } from "../../utils";
import { formatBytes, formatDate } from "./gbFormat";

export type GbInstallHandler = (
  file: GbModFile,
  modName: string,
  gamebananaId: number,
  version?: string,
  categoryName?: string,
  previewUrl?: string,
) => void;

interface GbModFilesTabProps {
  profile: GbModProfile;
  files: GbModFile[];
  downloadQueue: DownloadQueueItem[];
  primaryPreviewUrl?: string;
  onInstall: GbInstallHandler;
}

export default function GbModFilesTab({
  profile,
  files,
  downloadQueue,
  primaryPreviewUrl,
  onInstall,
}: GbModFilesTabProps) {
  return (
    <Stack gap="xs">
      {files.length > 0 ? (
        files.map((f) => {
          const downloadKey = String(f._idRow);
          const queueItem = downloadQueue.find(
            (item) => item.id === downloadKey,
          );
          const isDownloading = queueItem?.status === "downloading";
          const isExtracting = queueItem?.status === "extracting";
          const isQueued = queueItem?.status === "queued";
          const isCompleted = queueItem?.status === "completed";
          const isFailed = queueItem?.status === "failed";

          return (
            <Card key={f._idRow} p="xs">
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Stack gap="3xs" style={{ flex: 1, minWidth: 0 }}>
                  <Text fw={600} size="sm" truncate>
                    {f._sFile}
                  </Text>
                  <Group gap="xs">
                    <Badge size="xs" variant="outline" color="gray">
                      {formatBytes(f._nFilesize)}
                    </Badge>
                    <Text size="2xs" c="dimmed">
                      {formatDate(f._tsDateAdded)}
                    </Text>
                  </Group>
                  {f._sDescription && (
                    <Text size="xs" c="dimmed" mt="2xs">
                      {f._sDescription}
                    </Text>
                  )}
                </Stack>

                <Button
                  size="xs"
                  variant={
                    isCompleted || isFailed || isQueued ? "light" : "filled"
                  }
                  color={
                    isCompleted
                      ? "green"
                      : isFailed
                        ? "red"
                        : isQueued
                          ? "yellow"
                          : undefined
                  }
                  leftSection={
                    isCompleted ? <Check size={14} /> : <Download size={14} />
                  }
                  loading={isDownloading || isExtracting}
                  disabled={isCompleted || isQueued}
                  onClick={() =>
                    onInstall(
                      f,
                      profile._sName,
                      profile._idRow,
                      formatVersion(profile._sVersion),
                      profile._aCategory?._sName,
                      primaryPreviewUrl,
                    )
                  }
                >
                  {isDownloading
                    ? `${Math.round(queueItem.progress.percentage)}%`
                    : isExtracting
                      ? "Extracting"
                      : isQueued
                        ? "Queued"
                        : isCompleted
                          ? "Installed"
                          : isFailed
                            ? "Retry"
                            : "Install"}
                </Button>
              </Group>

              {isDownloading && queueItem && (
                <Box mt="xs">
                  <Group justify="space-between" mb="2xs">
                    <Text size="2xs" c="dimmed">
                      Speed: {queueItem.progress.speed} | ETA:{" "}
                      {queueItem.progress.eta}
                    </Text>
                    <Text size="2xs" fw={600}>
                      {Math.round(queueItem.progress.percentage)}%
                    </Text>
                  </Group>
                  <Progress
                    value={queueItem.progress.percentage}
                    size="xs"
                    animated
                    color="gray"
                  />
                </Box>
              )}

              {isExtracting && (
                <Box mt="xs">
                  <Progress value={100} size="xs" animated color="gray" />
                  <Text size="2xs" c="dimmed" ta="right" mt="2xs">
                    Extracting and installing archive...
                  </Text>
                </Box>
              )}
            </Card>
          );
        })
      ) : (
        <Text size="sm" c="dimmed" ta="center" py="md">
          No files available for download
        </Text>
      )}
    </Stack>
  );
}
