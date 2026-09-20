import { Avatar, Box, Button, Card, Group, Stack, Text } from "@mantine/core";
import { GbPost } from "../../api/gamebanana";
import { formatDate } from "./gbFormat";

interface GbModCommentsTabProps {
  posts: GbPost[];
  replies: Record<number, GbPost[]>;
  onToggleReplies: (postId: number) => void;
}

export default function GbModCommentsTab({
  posts,
  replies,
  onToggleReplies,
}: GbModCommentsTabProps) {
  return (
    <Box p="xs">
      {posts.length > 0 ? (
        <Stack gap="xs">
          {posts.map((p) => (
            <Card key={p._idRow} p="xs">
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <Avatar src={p._aSubmitter?._sAvatarUrl} size="xs" />
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

              {typeof p._nReplyCount === "number" && p._nReplyCount > 0 && (
                <Box mt="xs">
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    onClick={() => onToggleReplies(p._idRow)}
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
                        borderLeft: "2px solid var(--color-border-subtle)",
                      }}
                    >
                      {replies[p._idRow].map((r) => (
                        <Box key={r._idRow} p="2xs">
                          <Group justify="space-between" mb="3xs">
                            <Group gap="xs">
                              <Avatar
                                src={r._aSubmitter?._sAvatarUrl}
                                size="xs"
                              />
                              <Text fw={600} size="2xs">
                                {r._aSubmitter?._sName || "User"}
                              </Text>
                            </Group>
                            <Text size="2xs" c="dimmed">
                              {formatDate(r._tsDateAdded)}
                            </Text>
                          </Group>
                          <div
                            className="gb-rich-text"
                            dangerouslySetInnerHTML={{ __html: r._sText }}
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
  );
}
