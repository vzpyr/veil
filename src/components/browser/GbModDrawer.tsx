import { Carousel } from "@mantine/carousel";
import {
  Avatar,
  Box,
  Card,
  Drawer,
  Group,
  Image,
  LoadingOverlay,
  ScrollArea,
  Stack,
  Tabs,
  Text,
} from "@mantine/core";
import { Download, History, Info, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import {
  fetchModPosts,
  fetchModProfile,
  fetchModUpdates,
  fetchPostReplies,
  GbModProfile,
  GbPost,
  GbUpdate,
} from "../../api/gamebanana";
import { DownloadQueueItem } from "../../types";
import GbModCommentsTab from "./GbModCommentsTab";
import GbModDescriptionTab from "./GbModDescriptionTab";
import GbModDrawerTitle from "./GbModDrawerTitle";
import GbModErrorState from "./GbModErrorState";
import GbModFilesTab, { GbInstallHandler } from "./GbModFilesTab";
import GbModUpdatesTab from "./GbModUpdatesTab";
import { formatDate } from "./gbFormat";

interface GbModDrawerProps {
  modId: number | null;
  opened: boolean;
  onClose: () => void;
  onInstall: GbInstallHandler;
  downloadQueue: DownloadQueueItem[];
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
      title={<GbModDrawerTitle profile={profile} />}
    >
      <Box style={{ position: "relative", height: "100%" }}>
        <LoadingOverlay visible={isLoading} />

        {errorMessage && !isLoading && (
          <GbModErrorState
            message={errorMessage}
            onRetry={() => setRetryTrigger((prev) => prev + 1)}
          />
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
                        {profile._aSubmitter?._sName || "Unknown author"}
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
                  <GbModFilesTab
                    profile={profile}
                    files={files}
                    downloadQueue={downloadQueue}
                    primaryPreviewUrl={primaryPreviewUrl}
                    onInstall={onInstall}
                  />
                </Tabs.Panel>

                <Tabs.Panel
                  value="description"
                  pt="sm"
                  className="animate-fade-in"
                >
                  <GbModDescriptionTab text={profile._sText} />
                </Tabs.Panel>

                <Tabs.Panel value="updates" pt="sm" className="animate-fade-in">
                  <GbModUpdatesTab updates={updates} />
                </Tabs.Panel>

                <Tabs.Panel
                  value="comments"
                  pt="sm"
                  className="animate-fade-in"
                >
                  <GbModCommentsTab
                    posts={posts}
                    replies={replies}
                    onToggleReplies={handleToggleReplies}
                  />
                </Tabs.Panel>
              </Tabs>
            </Stack>
          </ScrollArea>
        )}
      </Box>
    </Drawer>
  );
}
