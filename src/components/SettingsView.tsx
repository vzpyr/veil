import {
  Box,
  Button,
  Card,
  Group,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { Folder, FolderOpen } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { GameDefinition, GameSettings } from "../types";

interface SettingsViewProps {
  activeGame: GameDefinition;
  settings: GameSettings;
  autoCategorize: boolean;
  showNsfw: boolean;
  autoCheckUpdates: boolean;
  colorScheme: string;
  onUpdateModsDir: (dir: string) => void;
  onUpdateGameDir?: (dir: string) => void;
  onUpdateAutoCategorize: (enabled: boolean) => void;
  onShowNsfwChange: (value: boolean) => void;
  onUpdateAutoCheckUpdates: (enabled: boolean) => void;
  onColorSchemeChange: (scheme: string) => void;
}

export default function SettingsView({
  activeGame,
  settings,
  autoCategorize,
  showNsfw,
  autoCheckUpdates,
  colorScheme,
  onUpdateModsDir,
  onUpdateGameDir,
  onUpdateAutoCategorize,
  onShowNsfwChange,
  onUpdateAutoCheckUpdates,
  onColorSchemeChange,
}: SettingsViewProps) {
  const isNtePak = activeGame.id === "ntepak";
  const displayedDir = isNtePak ? settings.game_dir : settings.mods_dir;

  const handleBrowseFolder = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: isNtePak
        ? "Select Neverness to Everness Base Game Directory"
        : `Select ${activeGame.name} Mods Directory`,
    });

    if (typeof selected === "string") {
      if (isNtePak && onUpdateGameDir) {
        onUpdateGameDir(selected);
      } else {
        onUpdateModsDir(selected);
      }
    }
  };

  const handleOpenFolder = async () => {
    if (displayedDir) {
      await openPath(displayedDir);
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
                {isNtePak ? "Base Game Directory" : "Game Mods Directory"}
              </Text>
              <Text c="dimmed" size="xs">
                {isNtePak
                  ? "Select your Neverness to Everness base game directory."
                  : "Select your Model Importer's Mods directory."}
              </Text>
            </div>

            <Group gap="xs" align="center" wrap="nowrap">
              <TextInput
                size="xs"
                value={displayedDir || ""}
                placeholder={
                  isNtePak
                    ? "No game directory selected"
                    : "No directory selected"
                }
                readOnly
                leftSection={<Folder size={16} />}
                style={{ flex: 1 }}
              />
              {displayedDir && (
                <Button
                  size="xs"
                  variant="default"
                  leftSection={<FolderOpen size={14} />}
                  onClick={handleOpenFolder}
                >
                  Open
                </Button>
              )}
              <Button size="xs" variant="default" onClick={handleBrowseFolder}>
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

        <Card p="sm">
          <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
            <Text fw={600} size="sm">
              Show NSFW Mods
            </Text>
            <Switch
              size="md"
              checked={showNsfw}
              onChange={(e) => onShowNsfwChange(e.currentTarget.checked)}
            />
          </Group>
        </Card>

        <Card p="sm">
          <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
            <Text fw={600} size="sm">
              Auto Check for Updates
            </Text>
            <Switch
              size="md"
              checked={autoCheckUpdates}
              onChange={(e) =>
                onUpdateAutoCheckUpdates(e.currentTarget.checked)
              }
            />
          </Group>
        </Card>

        <Card p="sm">
          <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
            <Text fw={600} size="sm">
              Color Scheme
            </Text>
            <SegmentedControl
              size="xs"
              value={colorScheme === "light" ? "light" : "dark"}
              onChange={onColorSchemeChange}
              data={[
                { value: "dark", label: "Dark" },
                { value: "light", label: "Light" },
              ]}
            />
          </Group>
        </Card>
      </Stack>
    </Box>
  );
}
