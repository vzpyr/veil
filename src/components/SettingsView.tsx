import {
  Box,
  Button,
  Card,
  Group,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { Folder, FolderOpen } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { GameDefinition, GameSettings } from "../types";

interface SettingsViewProps {
  activeGame: GameDefinition;
  settings: GameSettings;
  autoCategorize: boolean;
  onUpdateModsDir: (dir: string) => void;
  onUpdateAutoCategorize: (enabled: boolean) => void;
}

export default function SettingsView({
  activeGame,
  settings,
  autoCategorize,
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
    <Box p="sm" maw="var(--max-width-settings)" mx="auto">
      <Stack gap="md">
        <div>
          <Text fw={700} size="md">
            {activeGame.name} Settings
          </Text>
        </div>

        <Card p="sm">
          <Stack gap="sm">
            <div>
              <Text fw={600} size="sm">
                Game Mods Directory
              </Text>
              <Text c="dimmed" size="xs">
                Select your Model Importer's Mods directory.
              </Text>
            </div>

            <Group gap="xs" align="center" wrap="nowrap">
              <TextInput
                size="xs"
                radius="xl"
                value={settings.mods_dir || ""}
                placeholder="No directory selected"
                readOnly
                leftSection={<Folder size={16} />}
                style={{ flex: 1 }}
              />
              {settings.mods_dir && (
                <Button
                  size="xs"
                  radius="xl"
                  variant="default"
                  leftSection={<FolderOpen size={14} />}
                  onClick={handleOpenFolder}
                >
                  Reveal
                </Button>
              )}
              <Button
                size="xs"
                radius="xl"
                variant="default"
                onClick={handleBrowseFolder}
              >
                Browse
              </Button>
            </Group>
          </Stack>
        </Card>

        <Card p="sm">
          <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
            <Text fw={600} size="sm">
              Auto-categorize GameBanana Downloads
            </Text>
            <Switch
              size="md"
              checked={autoCategorize}
              onChange={(e) => onUpdateAutoCategorize(e.currentTarget.checked)}
            />
          </Group>
        </Card>
      </Stack>
    </Box>
  );
}
