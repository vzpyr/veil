import {
  ActionIcon,
  Card,
  Center,
  Drawer,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  CircleAlert,
  Keyboard,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import useKeybindRecorder from "../hooks/useKeybindRecorder";
import { ModItem, ModKeybind, ModKeybindData } from "../types";
import KeybindList from "./KeybindList";
import KeybindVariableList from "./KeybindVariableList";

interface KeybindDrawerProps {
  opened: boolean;
  onClose: () => void;
  mod: ModItem | null;
  modsDir: string | undefined;
}

const EMPTY_KEYBINDS: ModKeybind[] = [];

export default function KeybindDrawer({
  opened,
  onClose,
  mod,
  modsDir,
}: KeybindDrawerProps) {
  const [data, setData] = useState<ModKeybindData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    if (!mod || !modsDir) {
      setData(null);
      return;
    }

    try {
      setLoading(true);
      const result = await invoke<ModKeybindData>("get_mod_keybinds", {
        modsDir,
        modId: mod.id,
      });
      setData(result);
    } catch (err) {
      notifications.show({
        title: "Load Failed",
        message: String(err),
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  }, [mod, modsDir]);

  const handleUpdateKeybind = async (
    keybind: ModKeybind,
    index: number,
    newCombo: string,
  ) => {
    if (!data) return;

    const previousKeybinds = [...data.keybinds];
    setData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        keybinds: prev.keybinds.map((k, i) =>
          i === index ? { ...k, key: newCombo } : k,
        ),
      };
    });

    try {
      await invoke("set_mod_keybind", {
        iniPath: keybind.ini_path,
        section: keybind.section,
        newKey: newCombo,
      });
    } catch (err) {
      setData((prev) =>
        prev ? { ...prev, keybinds: previousKeybinds } : null,
      );
      notifications.show({
        title: "Update Failed",
        message: String(err),
        color: "red",
        icon: <CircleAlert size={16} />,
      });
    }
  };

  const { recordingIndex, currentModifiers, startRecording, cancelRecording } =
    useKeybindRecorder(data?.keybinds ?? EMPTY_KEYBINDS, handleUpdateKeybind);

  useEffect(() => {
    if (opened && mod) {
      cancelRecording();
      loadData();
    }
  }, [opened, mod, loadData, cancelRecording]);

  const handleToggleVariable = async (variable: string, newValue: number) => {
    if (!mod || !modsDir || !data) return;

    const previousData = { ...data };
    setData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        variables: prev.variables.map((v) =>
          v.variable === variable ? { ...v, current_value: newValue } : v,
        ),
      };
    });

    try {
      await invoke("set_mod_toggle_state", {
        modsDir,
        modName: mod.name,
        variable,
        newValue,
      });
    } catch (err) {
      setData(previousData);
      notifications.show({
        title: "Update Failed",
        message: String(err),
        color: "red",
        icon: <CircleAlert size={16} />,
      });
    }
  };

  const hasContent =
    data && (data.keybinds.length > 0 || data.variables.length > 0);

  return (
    <Drawer
      opened={opened}
      onClose={() => {
        cancelRecording();
        onClose();
      }}
      closeOnEscape={recordingIndex === null}
      size="lg"
      title={
        <Group gap="xs">
          <Keyboard size={20} color="var(--color-accent-primary)" />
          <Text fw={700} size="md">
            Mod Keybinds and Toggles
          </Text>
        </Group>
      }
    >
      <Stack gap="sm" h="100%">
        {mod && (
          <Card
            p="xs"
            style={{
              backgroundColor: "var(--color-bg-surface-2)",
            }}
          >
            <Group justify="space-between" align="center">
              <Stack gap="3xs">
                <Text fw={600} size="sm">
                  {mod.name}
                </Text>
              </Stack>
              <Tooltip label="Refresh keybinds and toggle states">
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={loadData}
                  loading={loading}
                >
                  <RefreshCw size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Card>
        )}

        {loading ? (
          <Center py="xl">
            <Loader size="sm" color="gray" />
          </Center>
        ) : !hasContent ? (
          <Center py="2xl">
            <Stack align="center" gap="sm">
              <SlidersHorizontal size={44} color="var(--color-text-muted)" />
              <Text fw={600} size="md">
                No Keybinds or Toggles Found
              </Text>
              <Text
                size="xs"
                c="dimmed"
                ta="center"
                maw="var(--max-width-text-sm)"
              >
                This mod does not declare any configurable keybinds or toggle
                variables in its configuration files.
              </Text>
            </Stack>
          </Center>
        ) : (
          <ScrollArea style={{ flex: 1 }}>
            <Stack gap="md" pr="xs">
              {data && data.variables.length > 0 && (
                <KeybindVariableList
                  variables={data.variables}
                  onToggleVariable={handleToggleVariable}
                />
              )}

              {data && data.keybinds.length > 0 && (
                <KeybindList
                  keybinds={data.keybinds}
                  recordingIndex={recordingIndex}
                  currentModifiers={currentModifiers}
                  onStartRecording={startRecording}
                  onCancelRecording={cancelRecording}
                />
              )}
            </Stack>
          </ScrollArea>
        )}
      </Stack>
    </Drawer>
  );
}
