import { Badge, Box, Card, Group, Stack, Text } from "@mantine/core";
import { GbUpdate } from "../../api/gamebanana";
import { formatVersion } from "../../utils";
import { formatDate } from "./gbFormat";

export default function GbModUpdatesTab({ updates }: { updates: GbUpdate[] }) {
  return (
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
  );
}
