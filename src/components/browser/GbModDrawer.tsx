import { Carousel } from "@mantine/carousel";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Drawer,
  Group,
  Image,
  LoadingOverlay,
  Progress,
  ScrollArea,
  Stack,
  Tabs,
  Text,
} from "@mantine/core";
import {
  IconCheck,
  IconDownload,
  IconHistory,
  IconInfoCircle,
  IconMessageCircle,
  IconWorld,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import {
  fetchModPosts,
  fetchModProfile,
  fetchModUpdates,
  fetchPostReplies,
  GbModFile,
  GbModProfile,
  GbPost,
  GbUpdate,
} from "../../api/gamebanana";
import { DownloadQueueItem } from "../../types";

interface GbModDrawerProps {
  modId: number | null;
  opened: boolean;
  onClose: () => void;
  onInstall: (
    file: GbModFile,
    modName: string,
    gamebananaId: number,
    version?: string,
    categoryName?: string,
    previewUrl?: string,
  ) => void;
  downloadQueue: DownloadQueueItem[];
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${bytes} B`;
}

function formatDate(timestamp: number): string {
  if (!timestamp) return "";
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function GbModDrawer({
  modId,
  opened,
  onClose,
  onInstall,
  downloadQueue,
}: GbModDrawerProps) {
  const [profile, setProfile] = useState<GbModProfile | null>(null);
  const [updates, setUpdates] = useState<GbUpdate[]>([]);
  const [posts, setPosts] = useState<GbPost[]>([]);
  const [replies, setReplies] = useState<Record<number, GbPost[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>("files");

  useEffect(() => {
    if (!modId || !opened) {
      setProfile(null);
      setUpdates([]);
      setPosts([]);
      setReplies({});
      return;
    }

    async function loadModData(id: number) {
      setIsLoading(true);
      try {
        const [profileData, updatesData, postsData] = await Promise.all([
          fetchModProfile(id),
          fetchModUpdates(id),
          fetchModPosts(id, 1),
        ]);
        setProfile(profileData);
        setUpdates(updatesData);
        setPosts(postsData);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    loadModData(modId);
  }, [modId, opened]);

  const handleToggleReplies = async (postId: number) => {
    if (replies[postId]) {
      setReplies((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      return;
    }

    try {
      const replyData = await fetchPostReplies(postId);
      setReplies((prev) => ({ ...prev, [postId]: replyData }));
    } catch (err) {
      console.error(err);
    }
  };

  const images = profile?._aPreviewMedia?._aImages || [];
  const primaryPreviewUrl = images[0]
    ? `${images[0]._sBaseUrl}/${images[0]._sFile530 || images[0]._sFile}`
    : undefined;

  const files = profile?._aFiles
    ? [...profile._aFiles].sort((a, b) => {
        const dateDiff = (b._tsDateAdded || 0) - (a._tsDateAdded || 0);
        if (dateDiff !== 0) return dateDiff;
        return b._idRow - a._idRow;
      })
    : [];

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="xl"
      radius="lg"
      title={
        <Group gap="xs">
          <IconWorld size={20} color="var(--color-accent-primary)" />
          {profile ? (
            <Group gap="xs">
              <Text fw={700} size="md">
                {profile._sName}
              </Text>
              {profile._aCategory && (
                <Badge size="xs" radius="xl" variant="light" color="gray">
                  {profile._aCategory._sName}
                </Badge>
              )}
              {profile._sVersion && (
                <Badge size="xs" radius="xl" variant="outline" color="gray">
                  v{profile._sVersion}
                </Badge>
              )}
            </Group>
          ) : (
            <Text fw={700} size="md">
              Mod Details
            </Text>
          )}
        </Group>
      }
    >
      <Box style={{ position: "relative", height: "100%" }}>
        <LoadingOverlay visible={isLoading} />

        {profile && (
          <ScrollArea style={{ height: "100%" }} offsetScrollbars>
            <Stack gap="sm" pr="xs">
              {images.length > 0 && (
                <Carousel
                  withIndicators
                  height="var(--height-carousel)"
                  slideSize="100%"
                  slideGap="sm"
                  loop
                >
                  {images.map((img, idx) => (
                    <Carousel.Slide key={idx}>
                      <Image
                        src={`${img._sBaseUrl}/${img._sFile530 || img._sFile}`}
                        h="var(--height-carousel)"
                        fit="contain"
                        style={{
                          backgroundColor: "var(--color-bg-surface-1)",
                          borderRadius: "var(--radius-md)",
                        }}
                      />
                    </Carousel.Slide>
                  ))}
                </Carousel>
              )}

              <Card
                p="xs"
                radius="md"
                withBorder
                style={{
                  backgroundColor: "var(--color-bg-surface-2)",
                }}
              >
                <Group justify="space-between" align="center">
                  <Group gap="sm">
                    <Avatar
                      src={profile._aSubmitter?._sAvatarUrl}
                      size="sm"
                      radius="xl"
                    />
                    <div>
                      <Text fw={600} size="xs">
                        {profile._aSubmitter?._sName || "Unknown Submitter"}
                      </Text>
                      {profile._aSubmitter?._sLocation && (
                        <Text size="2xs" c="dimmed">
                          {profile._aSubmitter._sLocation}
                        </Text>
                      )}
                    </div>
                  </Group>

                  <Group gap="xs">
                    {profile._tsDateAdded && (
                      <Text size="2xs" c="dimmed">
                        Added: {formatDate(profile._tsDateAdded)}
                      </Text>
                    )}
                    {profile._tsDateModified && (
                      <Text size="2xs" c="dimmed">
                        Updated: {formatDate(profile._tsDateModified)}
                      </Text>
                    )}
                  </Group>
                </Group>
              </Card>

              <Tabs
                value={activeTab}
                onChange={setActiveTab}
                variant="pills"
                radius="xl"
              >
                <Tabs.List>
                  <Tabs.Tab
                    value="files"
                    leftSection={<IconDownload size={14} />}
                  >
                    Files ({files.length})
                  </Tabs.Tab>
                  <Tabs.Tab
                    value="description"
                    leftSection={<IconInfoCircle size={14} />}
                  >
                    Description
                  </Tabs.Tab>
                  <Tabs.Tab
                    value="updates"
                    leftSection={<IconHistory size={14} />}
                  >
                    Updates ({updates.length})
                  </Tabs.Tab>
                  <Tabs.Tab
                    value="comments"
                    leftSection={<IconMessageCircle size={14} />}
                  >
                    Comments ({posts.length})
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="files" pt="sm">
                  <Stack gap="xs">
                    {files.length > 0 ? (
                      files.map((f) => {
                        const downloadKey = String(f._idRow);
                        const queueItem = downloadQueue.find(
                          (item) => item.id === downloadKey,
                        );
                        const isDownloading =
                          queueItem?.status === "downloading";
                        const isExtracting = queueItem?.status === "extracting";
                        const isQueued = queueItem?.status === "queued";
                        const isCompleted = queueItem?.status === "completed";
                        const isFailed = queueItem?.status === "failed";

                        return (
                          <Card key={f._idRow} p="xs" radius="md" withBorder>
                            <Group
                              justify="space-between"
                              align="flex-start"
                              wrap="nowrap"
                            >
                              <Stack gap="3xs" style={{ flex: 1, minWidth: 0 }}>
                                <Text fw={600} size="sm" truncate>
                                  {f._sFile}
                                </Text>
                                <Group gap="xs">
                                  <Badge
                                    size="xs"
                                    radius="xl"
                                    variant="outline"
                                    color="gray"
                                  >
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
                                radius="xl"
                                variant={
                                  isCompleted || isFailed || isQueued
                                    ? "light"
                                    : "filled"
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
                                  isCompleted ? (
                                    <IconCheck size={14} />
                                  ) : (
                                    <IconDownload size={14} />
                                  )
                                }
                                loading={isDownloading || isExtracting}
                                disabled={isCompleted || isQueued}
                                onClick={() =>
                                  onInstall(
                                    f,
                                    profile._sName,
                                    profile._idRow,
                                    profile._sVersion,
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
                                  radius="xl"
                                />
                              </Box>
                            )}

                            {isExtracting && (
                              <Box mt="xs">
                                <Progress
                                  value={100}
                                  size="xs"
                                  animated
                                  color="gray"
                                  radius="xl"
                                />
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
                </Tabs.Panel>

                <Tabs.Panel value="description" pt="sm">
                  <Box p="xs">
                    {profile._sText ? (
                      <div
                        className="gb-rich-text"
                        dangerouslySetInnerHTML={{ __html: profile._sText }}
                      />
                    ) : (
                      <Text size="sm" c="dimmed" ta="center" py="md">
                        No description provided by author
                      </Text>
                    )}
                  </Box>
                </Tabs.Panel>

                <Tabs.Panel value="updates" pt="sm">
                  <Box p="xs">
                    {updates.length > 0 ? (
                      <Stack gap="xs">
                        {updates.map((u) => (
                          <Card key={u._idRow} p="xs" radius="md" withBorder>
                            <Group justify="space-between" mb="xs">
                              <Group gap="xs">
                                <Text fw={600} size="sm">
                                  {u._sName || "Update"}
                                </Text>
                                {u._sVersion && (
                                  <Badge size="xs" radius="xl" color="gray">
                                    v{u._sVersion}
                                  </Badge>
                                )}
                              </Group>
                              <Text size="2xs" c="dimmed">
                                {formatDate(u._tsDateAdded)}
                              </Text>
                            </Group>

                            {u._sText && (
                              <div
                                className="gb-rich-text"
                                style={{ marginBottom: "var(--space-xs)" }}
                                dangerouslySetInnerHTML={{ __html: u._sText }}
                              />
                            )}

                            {u._aChangeLog && u._aChangeLog.length > 0 && (
                              <Stack gap="3xs">
                                {u._aChangeLog.map((log, lIdx) => (
                                  <Group key={lIdx} gap="xs">
                                    <Badge
                                      size="xs"
                                      radius="xl"
                                      variant="dot"
                                      color="gray"
                                    >
                                      {log.cat}
                                    </Badge>
                                    <Text size="xs">{log.text}</Text>
                                  </Group>
                                ))}
                              </Stack>
                            )}
                          </Card>
                        ))}
                      </Stack>
                    ) : (
                      <Text size="sm" c="dimmed" ta="center" py="md">
                        No updates recorded for this mod
                      </Text>
                    )}
                  </Box>
                </Tabs.Panel>

                <Tabs.Panel value="comments" pt="sm">
                  <Box p="xs">
                    {posts.length > 0 ? (
                      <Stack gap="xs">
                        {posts.map((p) => (
                          <Card key={p._idRow} p="xs" radius="md" withBorder>
                            <Group justify="space-between" mb="xs">
                              <Group gap="xs">
                                <Avatar
                                  src={p._aSubmitter?._sAvatarUrl}
                                  size="xs"
                                  radius="xl"
                                />
                                <Text fw={600} size="xs">
                                  {p._aSubmitter?._sName || "User"}
                                </Text>
                              </Group>
                              <Text size="2xs" c="dimmed">
                                {formatDate(p._tsDateAdded)}
                              </Text>
                            </Group>

                            <div
                              className="gb-rich-text"
                              dangerouslySetInnerHTML={{ __html: p._sText }}
                            />

                            {typeof p._nReplyCount === "number" &&
                              p._nReplyCount > 0 && (
                                <Box mt="xs">
                                  <Button
                                    size="compact-xs"
                                    radius="xl"
                                    variant="subtle"
                                    onClick={() =>
                                      handleToggleReplies(p._idRow)
                                    }
                                  >
                                    {replies[p._idRow]
                                      ? "Hide Replies"
                                      : `Show Replies (${p._nReplyCount})`}
                                  </Button>

                                  {replies[p._idRow] && (
                                    <Stack
                                      gap="xs"
                                      pl="md"
                                      mt="xs"
                                      style={{
                                        borderLeft:
                                          "2px solid var(--color-border-subtle)",
                                      }}
                                    >
                                      {replies[p._idRow].map((r) => (
                                        <Box key={r._idRow} p="2xs">
                                          <Group
                                            justify="space-between"
                                            mb="3xs"
                                          >
                                            <Group gap="xs">
                                              <Avatar
                                                src={r._aSubmitter?._sAvatarUrl}
                                                size="xs"
                                                radius="xl"
                                              />
                                              <Text fw={600} size="2xs">
                                                {r._aSubmitter?._sName ||
                                                  "User"}
                                              </Text>
                                            </Group>
                                            <Text size="2xs" c="dimmed">
                                              {formatDate(r._tsDateAdded)}
                                            </Text>
                                          </Group>
                                          <div
                                            className="gb-rich-text"
                                            dangerouslySetInnerHTML={{
                                              __html: r._sText,
                                            }}
                                          />
                                        </Box>
                                      ))}
                                    </Stack>
                                  )}
                                </Box>
                              )}
                          </Card>
                        ))}
                      </Stack>
                    ) : (
                      <Text size="sm" c="dimmed" ta="center" py="md">
                        No comments posted on this mod yet
                      </Text>
                    )}
                  </Box>
                </Tabs.Panel>
              </Tabs>
            </Stack>
          </ScrollArea>
        )}
      </Box>
    </Drawer>
  );
}
