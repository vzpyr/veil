import { Box, Button, Group, Select, Stack, Text } from "@mantine/core";
import { Bookmark, Check, Save, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { ModItem, ModPreset } from "../types";

interface SidebarPresetsProps {
  presets: ModPreset[];
  selectedPresetId: string | null;
  onSelectPreset: (presetId: string | null) => void;
  mods: ModItem[];
  onOpenSaveModal: () => void;
  onApplyPreset: () => void;
  onDeletePreset: () => void;
  hasModsDir: boolean;
  isApplying?: boolean;
}

export default function SidebarPresets({
  presets,
  selectedPresetId,
  onSelectPreset,
  mods,
  onOpenSaveModal,
  onApplyPreset,
  onDeletePreset,
  hasModsDir,
  isApplying,
}: SidebarPresetsProps) {
  const selectedPreset = useMemo(() => {
    if (!selectedPresetId) return null;
    return presets.find((p) => p.id === selectedPresetId) || null;
  }, [presets, selectedPresetId]);

  const isPresetMatching = useMemo(() => {
    if (!selectedPreset) return false;
    const installedIds = new Set(mods.map((m) => m.id));
    const presetIds = new Set(
      selectedPreset.mod_ids.filter((id) => installedIds.has(id)),
    );
    const currentEnabledIds = new Set(
      mods.filter((m) => m.enabled).map((m) => m.id),
    );

    if (presetIds.size !== currentEnabledIds.size) return false;
    for (const id of currentEnabledIds) {
      if (!presetIds.has(id)) return false;
    }
    return true;
  }, [selectedPreset, mods]);

  const isSaveDisabled = Boolean(selectedPreset && isPresetMatching);
  const isNoneSelected = !selectedPreset;
  const isApplyDisabled =
    isNoneSelected || isPresetMatching || !hasModsDir || Boolean(isApplying);

  const selectData = useMemo(() => {
    return [
      { value: "__none__", label: "None" },
      ...presets.map((p) => ({ value: p.id, label: p.name })),
    ];
  }, [presets]);

  return (
    <Stack gap="xs">
      <Box px="xs">
        <Text
          size="3xs"
          fw={700}
          c="dimmed"
          tt="uppercase"
          style={{ letterSpacing: "0.08em" }}
        >
          Presets
        </Text>
      </Box>

      <Select
        size="xs"
        placeholder="Select preset"
        leftSection={<Bookmark size={14} />}
        data={selectData}
        value={selectedPresetId ?? "__none__"}
        onChange={(val) => onSelectPreset(val === "__none__" ? null : val)}
        disabled={!hasModsDir}
        allowDeselect={false}
      />

      <Group gap="2xs" grow wrap="nowrap">
        <Button
          size="xs"
          variant="default"
          leftSection={<Check size={13} />}
          disabled={isApplyDisabled}
          loading={isApplying}
          onClick={onApplyPreset}
          styles={{
            root: {
              paddingLeft: "var(--space-2xs)",
              paddingRight: "var(--space-2xs)",
            },
            label: { fontSize: "var(--font-size-2xs)" },
          }}
        >
          Apply
        </Button>
        <Button
          size="xs"
          variant="default"
          leftSection={<Save size={13} />}
          disabled={isSaveDisabled || !hasModsDir}
          onClick={onOpenSaveModal}
          styles={{
            root: {
              paddingLeft: "var(--space-2xs)",
              paddingRight: "var(--space-2xs)",
            },
            label: { fontSize: "var(--font-size-2xs)" },
          }}
        >
          Save
        </Button>
        <Button
          size="xs"
          variant="default"
          color="red"
          leftSection={<Trash2 size={13} />}
          disabled={isNoneSelected || !hasModsDir}
          onClick={onDeletePreset}
          styles={{
            root: {
              paddingLeft: "var(--space-2xs)",
              paddingRight: "var(--space-2xs)",
            },
            label: { fontSize: "var(--font-size-2xs)" },
          }}
        >
          Delete
        </Button>
      </Group>
    </Stack>
  );
}
