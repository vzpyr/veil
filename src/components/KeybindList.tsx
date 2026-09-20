import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { X } from "lucide-react";
import type { ModKeybind } from "../types";
import KeyDisplay from "./KeyDisplay";

interface KeybindListProps {
  keybinds: ModKeybind[];
  recordingIndex: number | null;
  currentModifiers: { ctrl: boolean; alt: boolean; shift: boolean };
  onStartRecording: (index: number) => void;
  onCancelRecording: () => void;
}

export default function KeybindList({
  keybinds,
  recordingIndex,
  currentModifiers,
  onStartRecording,
  onCancelRecording,
}: KeybindListProps) {
  return (
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
      {keybinds.map((k, index) => {
        const isRecording = recordingIndex === index;

        return (
          <Card
            key={`${k.ini_path}-${k.section}`}
            p="xs"
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
                    <Badge color="dark" variant="filled" size="sm">
                      {currentModifiers.ctrl && "Ctrl + "}
                      {currentModifiers.alt && "Alt + "}
                      {currentModifiers.shift && "Shift + "}
                      Press Key
                    </Badge>
                    <Tooltip label="Cancel rebind">
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="red"
                        onClick={onCancelRecording}
                      >
                        <X size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                ) : (
                  <>
                    <KeyDisplay keyStr={k.key} />
                    <Button
                      variant="default"
                      size="xs"
                      onClick={() => onStartRecording(index)}
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
  );
}
