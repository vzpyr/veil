import {
  Card,
  Group,
  SegmentedControl,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import type { ModVariableState } from "../types";

interface KeybindVariableListProps {
  variables: ModVariableState[];
  onToggleVariable: (variable: string, newValue: number) => void;
}

export default function KeybindVariableList({
  variables,
  onToggleVariable,
}: KeybindVariableListProps) {
  return (
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
      {variables.map((v) => {
        const isBinary =
          v.possible_values.length <= 2 &&
          v.possible_values.every((val) => val === 0 || val === 1);

        return (
          <Card key={v.variable} p="xs">
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
                    onToggleVariable(
                      v.variable,
                      e.currentTarget.checked ? 1 : 0,
                    )
                  }
                />
              ) : (
                <SegmentedControl
                  size="xs"
                  value={String(v.current_value)}
                  onChange={(val) => onToggleVariable(v.variable, Number(val))}
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
  );
}
