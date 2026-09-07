import {
  Alert,
  Box,
  Button,
  Card,
  Group,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import {
  IconFolder,
  IconFolderOpen,
  IconInfoCircle,
} from "@tabler/icons-react";
import { open } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { GameDefinition, GameSettings } from "../types";

interface SettingsViewProps {
  activeGame: GameDefinition;
  settings: GameSettings;
  onUpdateModsDir: (dir: string) => void;
  onUpdateAutoCategorize: (enabled: boolean) => void;
}

export default function SettingsView({
  activeGame,
  settings,
  onUpdateModsDir,
  onUpdateAutoCategorize,
}: SettingsViewProps) {
  const handleBrowseFolder = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: `Select ${activeGame.name} Mods Directory`,
    });

    if (typeof selected === "string") {
      onUpdateModsDir(selected);
    }
  };

  const handleOpenFolder = async () => {
    if (settings.mods_dir) {
      await revealItemInDir(settings.mods_dir);
    }
  };

  return (
    <Box p="lg" maw={720} mx="auto">
      <Stack gap="lg">
        <div>
          <Text fw={700} size="lg">
            {activeGame.name} Settings
          </Text>
          <Text c="dimmed" size="xs">
            Configure mod directories and behavior for this game profile.
          </Text>
        </div>

        <Card
          p="md"
          withBorder
          style={{
            backgroundColor: "var(--color-bg-card)",
            borderColor: "var(--color-border-subtle)",
          }}
        >
          <Stack gap="md">
            <div>
              <Text fw={600} size="sm">
                Game Mods Directory
              </Text>
              <Text c="dimmed" size="xs">
                Select your 3DMigoto or XXMI Mods directory. Veil will store
                staging mods in DISABLED_veil and symlink active mods into veil.
              </Text>
            </div>

            <TextInput
              size="sm"
              value={settings.mods_dir || ""}
              placeholder="No directory selected"
              readOnly
              leftSection={<IconFolder size={16} />}
              rightSectionWidth={180}
              rightSection={
                <Group gap="xs" pr="xs">
                  {settings.mods_dir && (
                    <Button
                      size="xs"
                      variant="subtle"
                      leftSection={<IconFolderOpen size={14} />}
                      onClick={handleOpenFolder}
                    >
                      Reveal
                    </Button>
                  )}
                  <Button
                    size="xs"
                    variant="light"
                    onClick={handleBrowseFolder}
                  >
                    Browse
                  </Button>
                </Group>
              }
            />
          </Stack>
        </Card>

        <Card
          p="md"
          withBorder
          style={{
            backgroundColor: "var(--color-bg-card)",
            borderColor: "var(--color-border-subtle)",
          }}
        >
          <Group justify="space-between" align="center">
            <div>
              <Text fw={600} size="sm">
                Auto-categorize GameBanana Downloads
              </Text>
              <Text c="dimmed" size="xs">
                Automatically extract downloaded mods into subfolders matching
                their GameBanana character or category.
              </Text>
            </div>

            <Switch
              size="md"
              checked={settings.auto_categorize}
              onChange={(e) => onUpdateAutoCategorize(e.currentTarget.checked)}
              color="blue"
            />
          </Group>
        </Card>

        <Alert color="blue" variant="light" icon={<IconInfoCircle size={16} />}>
          Veil organizes mods cleanly inside your chosen directory. Staging mods
          reside in DISABLED_veil where 3DMigoto ignores them. When enabled, a
          directory symlink is placed into veil for 3DMigoto to load.
        </Alert>
      </Stack>
    </Box>
  );
}
