import {
  Button,
  Drawer,
  Group,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { Bookmark } from "lucide-react";
import { useEffect, useState } from "react";
import { ModPreset } from "../types";

interface PresetSaveDrawerProps {
  opened: boolean;
  onClose: () => void;
  selectedPreset: ModPreset | null;
  enabledCount: number;
  onSave: (name: string, presetId?: string) => Promise<void>;
}

export default function PresetSaveDrawer({
  opened,
  onClose,
  selectedPreset,
  enabledCount,
  onSave,
}: PresetSaveDrawerProps) {
  const [mode, setMode] = useState<"new" | "overwrite">("new");
  const [nameInput, setNameInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (opened) {
      if (selectedPreset) {
        setMode("overwrite");
        setNameInput(selectedPreset.name);
      } else {
        setMode("new");
        setNameInput("");
      }
    }
  }, [opened, selectedPreset]);

  const isConfirmDisabled = mode === "new" ? !nameInput.trim() : false;

  const handleConfirm = async () => {
    try {
      setIsSaving(true);
      if (mode === "overwrite" && selectedPreset) {
        await onSave(selectedPreset.name, selectedPreset.id);
      } else {
        const trimmed = nameInput.trim();
        if (!trimmed) return;
        await onSave(trimmed);
      }
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      size="md"
      title={
        <Group gap="xs">
          <Bookmark size={20} color="var(--color-accent-primary)" />
          <Text fw={700} size="md">
            Save Preset
          </Text>
        </Group>
      }
    >
      <Stack gap="md" h="100%">
        {selectedPreset && (
          <SegmentedControl
            fullWidth
            size="xs"
            value={mode}
            onChange={(val) => {
              const newMode = val as "new" | "overwrite";
              setMode(newMode);
              if (newMode === "new") {
                setNameInput("");
              }
            }}
            data={[
              { label: "Overwrite", value: "overwrite" },
              { label: "Create new", value: "new" },
            ]}
          />
        )}

        {mode === "new" ? (
          <Stack gap="xs">
            <TextInput
              label="Preset name"
              placeholder="e.g. Combat, Casual, Story Mode..."
              value={nameInput}
              onChange={(e) => setNameInput(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isConfirmDisabled && !isSaving) {
                  handleConfirm();
                }
              }}
              data-autofocus
            />
            <Text size="xs" c="dimmed">
              Save the currently enabled mods ({enabledCount}{" "}
              {enabledCount === 1 ? "mod" : "mods"}) as a new preset.
            </Text>
          </Stack>
        ) : (
          <Stack gap="xs">
            <Text size="sm">
              Overwrite{" "}
              <Text span fw={700} c="var(--color-text-primary)">
                {selectedPreset?.name}
              </Text>{" "}
              with the currently enabled mods ({enabledCount}{" "}
              {enabledCount === 1 ? "mod" : "mods"})?
            </Text>
            <Text size="xs" c="dimmed">
              This will update the saved mod list for this preset.
            </Text>
          </Stack>
        )}

        <Group justify="flex-end" gap="xs" mt="auto">
          <Button
            variant="default"
            size="xs"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            variant="filled"
            size="xs"
            onClick={handleConfirm}
            disabled={isConfirmDisabled || isSaving}
            loading={isSaving}
          >
            {mode === "overwrite" ? "Overwrite" : "Create"}
          </Button>
        </Group>
      </Stack>
    </Drawer>
  );
}
