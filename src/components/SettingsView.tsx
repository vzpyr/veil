import {
  Box,
  Button,
  Card,
  Group,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { Folder, FolderOpen } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { GameDefinition, GameSettings, NsfwVisibility } from "../types";

const nsfwOptions = [
  { value: "hide", label: "Completely Hidden" },
  { value: "warn", label: "Show with Badge" },
  { value: "show", label: "Show Normally" },
];

interface SettingsViewProps {
  activeGame: GameDefinition;
  settings: GameSettings;
  autoCategorize: boolean;
  showNsfw: NsfwVisibility;
  onUpdateModsDir: (dir: string) => void;
  onUpdateAutoCategorize: (enabled: boolean) => void;
  onShowNsfwChange: (value: NsfwVisibility) => void;
}

export default function SettingsView({
  activeGame,
  settings,
  autoCategorize,
  showNsfw,
  onUpdateModsDir,
  onUpdateAutoCategorize,
  onShowNsfwChange,
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

        <Card p="sm">
          <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Text fw={600} size="sm">
                NSFW Mods
              </Text>
              <Text c="dimmed" size="xs">
                Controls how age-gated GameBanana mods appear in the browser.
              </Text>
            </Box>
            <Select
              size="xs"
              w="var(--control-width-md)"
              data={nsfwOptions}
              value={showNsfw}
              onChange={(val) => {
                if (val === "hide" || val === "warn" || val === "show") {
                  onShowNsfwChange(val);
                }
              }}
              allowDeselect={false}
            />
          </Group>
        </Card>
      </Stack>
    </Box>
  );
}
