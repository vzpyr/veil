import {
  Alert,
  Badge,
  Card,
  Center,
  Drawer,
  Group,
  ScrollArea,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import { TriangleAlert } from "lucide-react";
import { ConflictGroup, ModItem } from "../types";

interface ConflictDrawerProps {
  opened: boolean;
  onClose: () => void;
  conflicts: ConflictGroup[];
  allMods: ModItem[];
  onToggleMod: (modId: string, enabled: boolean) => void;
}

export default function ConflictDrawer({
  opened,
  onClose,
  conflicts,
  allMods,
  onToggleMod,
}: ConflictDrawerProps) {
  const modMap = new Map<string, ModItem>();
  for (const m of allMods) {
    modMap.set(m.id, m);
  }

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="md"
      radius="lg"
      title={
        <Group gap="xs">
          <TriangleAlert size={20} color="var(--color-status-warning)" />
          <Text fw={700} size="md">
            Mod Conflict Resolution
          </Text>
        </Group>
      }
    >
      <Stack gap="sm" h="100%">
        <Alert
          color="orange"
          variant="light"
          radius="md"
          icon={<TriangleAlert size={16} />}
        >
          Active mods listed below share identical shader or texture hashes.
          Only one mod sharing a given hash should remain enabled to prevent
          rendering glitches.
        </Alert>

        {conflicts.length === 0 ? (
          <Center py="2xl">
            <Stack align="center" gap="sm">
              <TriangleAlert size={44} color="var(--color-text-muted)" />
              <Text fw={600} size="md">
                No Active Conflicts
              </Text>
              <Text c="dimmed" size="xs" ta="center">
                All enabled mods are compatible without overlapping shader or
                texture hashes.
              </Text>
            </Stack>
          </Center>
        ) : (
          <ScrollArea style={{ flex: 1 }}>
            <Stack gap="sm" pr="xs">
              {conflicts.map((c) => (
                <Card
                  key={c.hash}
                  p="xs"
                  radius="md"
                  withBorder
                  style={{
                    backgroundColor: "var(--color-bg-surface-2)",
                    borderColor: "var(--color-status-warning)",
                  }}
                >
                  <Group justify="space-between" mb="xs">
                    <Text size="xs" fw={700} c="dimmed">
                      Colliding Hash
                    </Text>
                    <Badge
                      size="xs"
                      radius="xl"
                      color="orange"
                      variant="outline"
                    >
                      {c.hash}
                    </Badge>
                  </Group>

                  <Stack gap="xs">
                    {c.mod_ids.map((modId) => {
                      const mod = modMap.get(modId);
                      if (!mod) {
                        return null;
                      }

                      return (
                        <Card key={modId} p="xs" radius="md" withBorder>
                          <Group justify="space-between">
                            <Stack gap="3xs">
                              <Text fw={600} size="sm">
                                {mod.name}
                              </Text>
                              {mod.category && (
                                <Text size="xs" c="dimmed">
                                  {mod.category}
                                </Text>
                              )}
                            </Stack>

                            <Switch
                              size="sm"
                              checked={mod.enabled}
                              onChange={(e) =>
                                onToggleMod(mod.id, e.currentTarget.checked)
                              }
                            />
                          </Group>
                        </Card>
                      );
                    })}
                  </Stack>
                </Card>
              ))}
            </Stack>
          </ScrollArea>
        )}
      </Stack>
    </Drawer>
  );
}
