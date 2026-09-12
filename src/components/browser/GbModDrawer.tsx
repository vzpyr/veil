import { Carousel } from "@mantine/carousel";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Center,
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
  Check,
  Download,
  Eye,
  Globe,
  Heart,
  History,
  Info,
  MessageCircle,
  TriangleAlert,
} from "lucide-react";
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
import { formatVersion } from "../../utils";

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState<string | null>("files");

  useEffect(() => {
    if (!modId || !opened) {
      setProfile(null);
      setUpdates([]);
      setPosts([]);
      setReplies({});
      setErrorMessage(null);
      return;
    }

    let isCurrent = true;

    async function loadModData(id: number) {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [profileResult, updatesResult, postsResult] =
          await Promise.allSettled([
            fetchModProfile(id),
            fetchModUpdates(id),
            fetchModPosts(id, 1),
          ]);

        if (!isCurrent) {
          return;
        }

        if (profileResult.status === "fulfilled") {
          setProfile(profileResult.value);
        } else {
          setErrorMessage(
            profileResult.reason instanceof Error
              ? profileResult.reason.message
              : "Failed to load mod profile",
          );
        }

        if (updatesResult.status === "fulfilled") {
          setUpdates(updatesResult.value);
        } else {
          setUpdates([]);
        }

        if (postsResult.status === "fulfilled") {
          setPosts(postsResult.value);
        } else {
          setPosts([]);
        }
      } catch (err) {
        if (!isCurrent) {
          return;
        }
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to load mod details",
        );
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    loadModData(modId);

    return () => {
      isCurrent = false;
    };
  }, [modId, opened, retryTrigger]);

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

  const files =
    profile?._aFiles && Array.isArray(profile._aFiles)
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
      size="xl"
      title={
        <Group gap="xs">
          <Globe size={20} color="var(--color-accent-primary)" />
          {profile ? (
            <Group gap="xs">
              <Text fw={700} size="md">
                {profile._sName}
              </Text>
              {profile._aCategory && (
                <Badge size="xs" variant="light" color="gray">
                  {profile._aCategory._sName}
                </Badge>
              )}
              {profile._sVersion && (
                <Badge size="xs" variant="outline" color="gray">
                  v{formatVersion(profile._sVersion)}
                </Badge>
              )}
              {typeof profile._nDownloadCount === "number" && (
                <Badge size="xs" variant="light" color="gray">
                  <Group gap="3xs" wrap="nowrap">
                    <Download size={12} />
                    <Text size="2xs">{profile._nDownloadCount}</Text>
                  </Group>
                </Badge>
              )}
              {typeof profile._nLikeCount === "number" && (
                <Badge size="xs" variant="light" color="gray">
                  <Group gap="3xs" wrap="nowrap">
                    <Heart size={12} />
                    <Text size="2xs">{profile._nLikeCount}</Text>
                  </Group>
                </Badge>
              )}
              {typeof profile._nViewCount === "number" && (
                <Badge size="xs" variant="light" color="gray">
                  <Group gap="3xs" wrap="nowrap">
                    <Eye size={12} />
                    <Text size="2xs">{profile._nViewCount}</Text>
                  </Group>
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

        {errorMessage && !isLoading && (
          <Center h="var(--height-empty-state)">
            <Stack align="center" gap="sm" className="animate-fade-in-up">
              <TriangleAlert size={44} color="var(--color-status-error)" />
              <Text fw={600} size="md">
                Failed to Load Mod
              </Text>
              <Text c="dimmed" size="xs" ta="center">
                {errorMessage}
              </Text>
              <Button
                size="xs"
                variant="default"
                onClick={() => setRetryTrigger((prev) => prev + 1)}
              >
                Retry
              </Button>
            </Stack>
          </Center>
        )}

        {profile && (
          <ScrollArea style={{ height: "100%" }} offsetScrollbars>
            <Stack gap="sm" pr="xs">
              {images.length > 0 && (
                <Carousel
                  withIndicators
                  height="var(--height-carousel)"
                  slideSize="100%"
                  slideGap="sm"
                  emblaOptions={{ loop: true }}
                >
                  {images.map((img, idx) => (
                    <Carousel.Slide key={idx}>
                      <Image
                        src={`${img._sBaseUrl}/${img._sFile530 || img._sFile}`}
                        h="var(--height-carousel)"
                        fit="contain"
                        style={{
                          backgroundColor: "var(--color-bg-surface-1)",
                          borderRadius: "var(--radius-lg)",
                        }}
                      />
                    </Carousel.Slide>
                  ))}
                </Carousel>
              )}

              <Card
                p="xs"
                style={{
                  backgroundColor: "var(--color-bg-surface-2)",
                }}
              >
                <Group justify="space-between" align="center">
                  <Group gap="sm">
                    <Avatar src={profile._aSubmitter?._sAvatarUrl} size="sm" />
                    <div>
                      <Text fw={600} size="xs">
                        {profile._aSubmitter?._sName || "Unknown Author"}
                      </Text>
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

              <Tabs value={activeTab} onChange={setActiveTab} variant="pills">
                <Tabs.List>
                  <Tabs.Tab value="files" leftSection={<Download size={14} />}>
                    Files ({files.length})
                  </Tabs.Tab>
                  <Tabs.Tab
                    value="description"
                    leftSection={<Info size={14} />}
                  >
                    Description
                  </Tabs.Tab>
                  <Tabs.Tab value="updates" leftSection={<History size={14} />}>
                    Updates ({updates.length})
                  </Tabs.Tab>
                  <Tabs.Tab
                    value="comments"
                    leftSection={<MessageCircle size={14} />}
                  >
                    Comments ({posts.length})
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="files" pt="sm" className="animate-fade-in">
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
                          <Card key={f._idRow} p="xs">
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
                                    <Check size={14} />
                                  ) : (
                                    <Download size={14} />
                                  )
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
                                <Progress
                                  value={100}
                                  size="xs"
                                  animated
                                  color="gray"
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

                <Tabs.Panel
                  value="description"
                  pt="sm"
                  className="animate-fade-in"
                >
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

                <Tabs.Panel value="updates" pt="sm" className="animate-fade-in">
                  <Box p="xs">
                    {updates.length > 0 ? (
                      <Stack gap="xs">
                        {updates.map((u) => (
                          <Card key={u._idRow} p="xs">
                            <Group justify="space-between" mb="xs">
                              <Group gap="xs">
                                <Text fw={600} size="sm">
                                  {u._sName || "Update"}
                                </Text>
                                {formatVersion(u._sVersion) && (
                                  <Badge size="xs" color="gray">
                                    v{formatVersion(u._sVersion)}
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
                                    <Badge size="xs" variant="dot" color="gray">
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

                <Tabs.Panel
                  value="comments"
                  pt="sm"
                  className="animate-fade-in"
                >
                  <Box p="xs">
                    {posts.length > 0 ? (
                      <Stack gap="xs">
                        {posts.map((p) => (
                          <Card key={p._idRow} p="xs">
                            <Group justify="space-between" mb="xs">
                              <Group gap="xs">
                                <Avatar
                                  src={p._aSubmitter?._sAvatarUrl}
                                  size="xs"
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
