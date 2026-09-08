import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Drawer,
  Group,
  Kbd,
  Loader,
  ScrollArea,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAdjustments,
  IconAlertCircle,
  IconCheck,
  IconInfoCircle,
  IconKeyboard,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import { ModItem, ModKeybind, ModKeybindData } from "../types";

interface KeybindDrawerProps {
  opened: boolean;
  onClose: () => void;
  mod: ModItem | null;
  modsDir: string | undefined;
}

function parseBaseKeyFromEvent(e: KeyboardEvent): string {
  const code = e.code;
  if (code.startsWith("Key") && code.length === 4) {
    return code.slice(3).toLowerCase();
  }
  if (code.startsWith("Digit") && code.length === 6) {
    return code.slice(5);
  }
  if (code.startsWith("Numpad")) {
    const numPart = code.slice(6);
    if (/^\d$/.test(numPart)) {
      return `numpad${numPart}`;
    }
    if (code === "NumpadAdd") return "add";
    if (code === "NumpadSubtract") return "subtract";
    if (code === "NumpadMultiply") return "multiply";
    if (code === "NumpadDivide") return "divide";
    if (code === "NumpadDecimal") return "decimal";
    if (code === "NumpadEnter") return "enter";
  }
  if (/^F\d+$/i.test(code)) {
    return code.toLowerCase();
  }
  if (code === "BracketLeft") return "[";
  if (code === "BracketRight") return "]";
  if (code === "Backslash") return "\\";
  if (code === "Semicolon") return ";";
  if (code === "Quote") return "'";
  if (code === "Comma") return ",";
  if (code === "Period") return ".";
  if (code === "Slash") return "/";
  if (code === "Minus") return "-";
  if (code === "Equal") return "=";
  if (code === "Backquote") return "`";
  if (code === "Space") return "space";
  if (code === "Tab") return "tab";
  if (code === "Enter") return "enter";
  if (code === "Backspace") return "backspace";
  if (code === "Delete") return "delete";
  if (code === "Insert") return "insert";
  if (code === "Home") return "home";
  if (code === "End") return "end";
  if (code === "PageUp") return "pageup";
  if (code === "PageDown") return "pagedown";
  if (code === "ArrowUp") return "up";
  if (code === "ArrowDown") return "down";
  if (code === "ArrowLeft") return "left";
  if (code === "ArrowRight") return "right";

  return e.key.toLowerCase();
}

function buildKeyCombination(e: KeyboardEvent): string | null {
  if (
    e.key === "Control" ||
    e.key === "Alt" ||
    e.key === "Shift" ||
    e.key === "Meta"
  ) {
    return null;
  }

  const baseKey = parseBaseKeyFromEvent(e);
  if (!baseKey) {
    return null;
  }

  const parts: string[] = [];
  if (e.ctrlKey) parts.push("ctrl");
  if (e.altKey) parts.push("alt");
  if (e.shiftKey) parts.push("shift");
  parts.push(baseKey);

  return parts.join(" ");
}

function formatTokenLabel(token: string): string {
  const lower = token.toLowerCase();
  if (lower === "ctrl") return "Ctrl";
  if (lower === "alt") return "Alt";
  if (lower === "shift") return "Shift";
  if (lower === "no_modifiers") return "No Modifiers";
  if (lower.startsWith("numpad")) {
    const rest = lower.slice(6);
    return `Num ${rest}`;
  }
  if (lower === "add") return "+";
  if (lower === "subtract") return "-";
  if (lower === "multiply") return "*";
  if (lower === "divide") return "/";
  if (lower === "decimal") return ".";
  if (lower.startsWith("f") && /^\d+$/.test(lower.slice(1))) {
    return lower.toUpperCase();
  }
  if (token.length === 1) {
    return token.toUpperCase();
  }
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function KeyDisplay({ keyStr }: { keyStr: string }) {
  const tokens = keyStr.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return (
      <Text size="xs" c="dimmed">
        None
      </Text>
    );
  }

  return (
    <Group gap="2xs" wrap="nowrap">
      {tokens.map((token, i) => (
        <Group key={i} gap="2xs" wrap="nowrap">
          {i > 0 &&
            token.toLowerCase() !== "no_modifiers" &&
            tokens[i - 1].toLowerCase() !== "no_modifiers" && (
              <Text size="xs" c="dimmed">
                +
              </Text>
            )}
          <Kbd size="xs">{formatTokenLabel(token)}</Kbd>
        </Group>
      ))}
    </Group>
  );
}

export default function KeybindDrawer({
  opened,
  onClose,
  mod,
  modsDir,
}: KeybindDrawerProps) {
  const [data, setData] = useState<ModKeybindData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [recordingIndex, setRecordingIndex] = useState<number | null>(null);
  const [currentModifiers, setCurrentModifiers] = useState<{
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
  }>({ ctrl: false, alt: false, shift: false });

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

  useEffect(() => {
    if (opened && mod) {
      setRecordingIndex(null);
      loadData();
    }
  }, [opened, mod, loadData]);

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
      notifications.show({
        title: "Toggle Updated",
        message: "Saved variable state to d3dx_user.ini.",
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      setData(previousData);
      notifications.show({
        title: "Update Failed",
        message: String(err),
        color: "red",
        icon: <IconAlertCircle size={16} />,
      });
    }
  };

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
      notifications.show({
        title: "Keybind Updated",
        message: `Saved key combination ${newCombo} to ${keybind.label}.`,
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      setData((prev) =>
        prev ? { ...prev, keybinds: previousKeybinds } : null,
      );
      notifications.show({
        title: "Update Failed",
        message: String(err),
        color: "red",
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setRecordingIndex(null);
    }
  };

  useEffect(() => {
    if (recordingIndex === null || !data) return;

    const targetKeybind = data.keybinds[recordingIndex];
    if (!targetKeybind) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        setRecordingIndex(null);
        setCurrentModifiers({ ctrl: false, alt: false, shift: false });
        return;
      }

      if (
        e.key === "Control" ||
        e.key === "Alt" ||
        e.key === "Shift" ||
        e.key === "Meta"
      ) {
        setCurrentModifiers({
          ctrl: e.ctrlKey,
          alt: e.altKey,
          shift: e.shiftKey,
        });
        return;
      }

      const combo = buildKeyCombination(e);
      if (combo) {
        handleUpdateKeybind(targetKeybind, recordingIndex, combo);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setCurrentModifiers({
        ctrl: e.ctrlKey,
        alt: e.altKey,
        shift: e.shiftKey,
      });
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
    };
  }, [recordingIndex, data]);

  const hasContent =
    data && (data.keybinds.length > 0 || data.variables.length > 0);

  return (
    <Drawer
      opened={opened}
      onClose={() => {
        setRecordingIndex(null);
        onClose();
      }}
      position="right"
      size="lg"
      radius="lg"
      title={
        <Group gap="xs">
          <IconKeyboard size={20} color="var(--color-accent-primary)" />
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
            radius="md"
            style={{
              backgroundColor: "var(--color-bg-surface-2)",
            }}
          >
            <Group justify="space-between" align="center">
              <Stack gap="3xs">
                <Text fw={600} size="sm">
                  {mod.name}
                </Text>
                {mod.category && (
                  <Badge size="xs" radius="xl" variant="filled" color="dark">
                    {mod.category}
                  </Badge>
                )}
              </Stack>
              <Tooltip label="Refresh keybinds and toggle states">
                <ActionIcon
                  variant="subtle"
                  radius="xl"
                  color="gray"
                  onClick={loadData}
                  loading={loading}
                >
                  <IconRefresh size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Card>
        )}

        <Alert
          color="gray"
          variant="light"
          radius="md"
          icon={<IconInfoCircle size={16} />}
        >
          Toggle states are persisted to d3dx_user.ini in your loader root
          folder. Keybind remappings update the mod configuration directly.
        </Alert>

        {loading ? (
          <Center py="xl">
            <Loader size="sm" color="gray" />
          </Center>
        ) : !hasContent ? (
          <Center py="2xl">
            <Stack align="center" gap="sm">
              <IconAdjustments size={44} color="var(--color-text-muted)" />
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
                <Stack gap="xs">
                  <Text
                    fw={700}
                    size="xs"
                    c="dimmed"
                    tt="uppercase"
                    style={{ letterSpacing: "0.08em" }}
                  >
                    Toggle States
                  </Text>
                  {data.variables.map((v) => {
                    const isBinary =
                      v.possible_values.length <= 2 &&
                      v.possible_values.every((val) => val === 0 || val === 1);

                    return (
                      <Card key={v.variable} p="xs" radius="md">
                        <Group justify="space-between" align="center">
                          <Stack gap="3xs">
                            <Text fw={600} size="sm">
                              {v.label}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {v.variable}
                            </Text>
                          </Stack>

                          {isBinary ? (
                            <Switch
                              size="md"
                              checked={v.current_value === 1}
                              onChange={(e) =>
                                handleToggleVariable(
                                  v.variable,
                                  e.currentTarget.checked ? 1 : 0,
                                )
                              }
                            />
                          ) : (
                            <SegmentedControl
                              size="xs"
                              radius="xl"
                              value={String(v.current_value)}
                              onChange={(val) =>
                                handleToggleVariable(v.variable, Number(val))
                              }
                              data={v.possible_values.map((val) => ({
                                label: String(val),
                                value: String(val),
                              }))}
                            />
                          )}
                        </Group>
                      </Card>
                    );
                  })}
                </Stack>
              )}

              {data && data.keybinds.length > 0 && (
                <Stack gap="xs">
                  <Text
                    fw={700}
                    size="xs"
                    c="dimmed"
                    tt="uppercase"
                    style={{ letterSpacing: "0.08em" }}
                  >
                    Keybinds
                  </Text>
                  {data.keybinds.map((k, index) => {
                    const isRecording = recordingIndex === index;

                    return (
                      <Card
                        key={`${k.ini_path}-${k.section}`}
                        p="xs"
                        radius="md"
                        style={{
                          backgroundColor: isRecording
                            ? "var(--color-bg-card-active)"
                            : "var(--color-bg-card)",
                          borderColor: isRecording
                            ? "var(--color-accent-primary)"
                            : "var(--color-border-subtle)",
                        }}
                      >
                        <Group justify="space-between" align="center">
                          <Stack gap="3xs">
                            <Text fw={600} size="sm">
                              {k.label}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {k.section}
                            </Text>
                          </Stack>

                          <Group gap="xs" align="center">
                            {isRecording ? (
                              <Group gap="xs">
                                <Badge
                                  color="dark"
                                  radius="xl"
                                  variant="filled"
                                  size="sm"
                                >
                                  {currentModifiers.ctrl && "Ctrl + "}
                                  {currentModifiers.alt && "Alt + "}
                                  {currentModifiers.shift && "Shift + "}
                                  Press Key
                                </Badge>
                                <Tooltip label="Cancel rebind">
                                  <ActionIcon
                                    size="sm"
                                    radius="xl"
                                    variant="light"
                                    color="red"
                                    onClick={() => setRecordingIndex(null)}
                                  >
                                    <IconX size={14} />
                                  </ActionIcon>
                                </Tooltip>
                              </Group>
                            ) : (
                              <>
                                <KeyDisplay keyStr={k.key} />
                                <Button
                                  variant="default"
                                  size="xs"
                                  radius="xl"
                                  onClick={() => {
                                    setRecordingIndex(index);
                                    setCurrentModifiers({
                                      ctrl: false,
                                      alt: false,
                                      shift: false,
                                    });
                                  }}
                                >
                                  Rebind
                                </Button>
                              </>
                            )}
                          </Group>
                        </Group>
                      </Card>
                    );
                  })}
                </Stack>
              )}
            </Stack>
          </ScrollArea>
        )}
      </Stack>
    </Drawer>
  );
}
