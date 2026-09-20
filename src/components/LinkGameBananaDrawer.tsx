import {
  Alert,
  Badge,
  Button,
  Drawer,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Check, CircleAlert, Link, Trash2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { fetchModProfile, GbModProfile } from "../api/gamebanana";
import { ModItem } from "../types";
import { formatVersion } from "../utils";

interface LinkGameBananaDrawerProps {
  opened: boolean;
  onClose: () => void;
  mod: ModItem | null;
  modsDir: string | undefined;
  gameId?: string;
  onSuccess: () => void;
}

function extractGameBananaId(input: string): number | null {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  const match = trimmed.match(/gamebanana\.com\/mods\/(\d+)/i);
  if (match) {
    return parseInt(match[1], 10);
  }

  return null;
}

export default function LinkGameBananaDrawer({
  opened,
  onClose,
  mod,
  modsDir,
  gameId,
  onSuccess,
}: LinkGameBananaDrawerProps) {
  const [inputVal, setInputVal] = useState<string>("");
  const [profile, setProfile] = useState<GbModProfile | null>(null);
  const [fetching, setFetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (opened && mod) {
      setInputVal(mod.gamebanana_id ? String(mod.gamebanana_id) : "");
      setProfile(null);
      setError(null);

      if (mod.gamebanana_id) {
        setFetching(true);
        fetchModProfile(mod.gamebanana_id)
          .then((p) => setProfile(p))
          .catch(() => setError("Failed to fetch current GameBanana profile."))
          .finally(() => setFetching(false));
      }
    }
  }, [opened, mod]);

  const handleLookup = async () => {
    const id = extractGameBananaId(inputVal);
    if (!id) {
      setError("Please enter a valid GameBanana mod URL or numeric ID.");
      setProfile(null);
      return;
    }

    try {
      setFetching(true);
      setError(null);
      const res = await fetchModProfile(id);
      setProfile(res);
    } catch (err) {
      setError(String(err));
      setProfile(null);
    } finally {
      setFetching(false);
    }
  };

  const handleLink = async () => {
    if (!mod || !modsDir || !profile) return;

    try {
      setSubmitting(true);
      const sortedFiles = profile._aFiles
        ? [...profile._aFiles].sort(
            (a, b) => (b._tsDateAdded || 0) - (a._tsDateAdded || 0),
          )
        : [];
      const latestFileId = sortedFiles[0]?._idRow;

      await invoke("link_mod_to_gamebanana", {
        modsDir,
        modId: mod.id,
        gamebananaId: profile._idRow,
        version: formatVersion(profile._sVersion) || null,
        fileId: latestFileId || null,
        gameId,
      });

      notifications.show({
        title: "Mod linked",
        message: `Linked ${mod.name} to GameBanana submission ${profile._sName}.`,
        color: "green",
        icon: <Check size={16} />,
      });

      onSuccess();
      onClose();
    } catch (err) {
      notifications.show({
        title: "Link failed",
        message: String(err),
        color: "red",
        icon: <CircleAlert size={16} />,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlink = async () => {
    if (!mod || !modsDir) return;

    try {
      setSubmitting(true);
      await invoke("unlink_mod_from_gamebanana", {
        modsDir,
        modId: mod.id,
        gameId,
      });

      notifications.show({
        title: "Mod unlinked",
        message: `Removed GameBanana mapping for ${mod.name}.`,
        color: "gray",
        icon: <Check size={16} />,
      });

      onSuccess();
      onClose();
    } catch (err) {
      notifications.show({
        title: "Unlink failed",
        message: String(err),
        color: "red",
        icon: <CircleAlert size={16} />,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      size="md"
      title={
        <Group gap="xs">
          <Link size={20} color="var(--color-accent-primary)" />
          <Text fw={700} size="md">
            Link mod to GameBanana
          </Text>
        </Group>
      }
    >
      <Stack gap="md" h="100%">
        {mod && (
          <Text size="sm" c="dimmed">
            Associate{" "}
            <Text span fw={600} c="var(--color-text-primary)">
              {mod.name}
            </Text>{" "}
            with a GameBanana mod page to enable automatic update checking.
          </Text>
        )}

        <Group align="flex-end" gap="xs">
          <TextInput
            label="GameBanana Mod URL or ID"
            placeholder="e.g. 523812 or https://gamebanana.com/mods/523812"
            value={inputVal}
            onChange={(e) => setInputVal(e.currentTarget.value)}
            style={{ flex: 1 }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleLookup();
              }
            }}
          />
          <Button
            variant="default"
            size="xs"
            onClick={handleLookup}
            loading={fetching}
            disabled={!inputVal.trim()}
          >
            Lookup
          </Button>
        </Group>

        {error && (
          <Alert color="red" variant="light" icon={<CircleAlert size={16} />}>
            {error}
          </Alert>
        )}

        {fetching && (
          <Group justify="center" py="md">
            <Loader size="sm" color="gray" />
          </Group>
        )}

        {profile && (
          <Paper p="sm">
            <Stack gap="xs">
              <Group justify="space-between" align="flex-start">
                <Text fw={600} size="sm">
                  {profile._sName}
                </Text>
                {profile._sVersion && (
                  <Badge size="xs" variant="filled" color="dark">
                    v{profile._sVersion}
                  </Badge>
                )}
              </Group>

              {profile._aSubmitter && (
                <Text size="xs" c="dimmed">
                  by {profile._aSubmitter._sName}
                </Text>
              )}

              {profile._aCategory && (
                <Text size="xs" c="dimmed">
                  Category: {profile._aCategory._sName}
                </Text>
              )}
            </Stack>
          </Paper>
        )}

        <Group
          justify={mod?.gamebanana_id ? "space-between" : "flex-end"}
          mt="auto"
        >
          {mod?.gamebanana_id && (
            <Button
              color="red"
              variant="default"
              size="xs"
              leftSection={<Trash2 size={14} />}
              onClick={handleUnlink}
              loading={submitting}
            >
              Unlink
            </Button>
          )}

          <Group gap="xs">
            <Button variant="default" size="xs" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="filled"
              size="xs"
              leftSection={<Link size={14} />}
              onClick={handleLink}
              loading={submitting}
              disabled={!profile}
            >
              Save Link
            </Button>
          </Group>
        </Group>
      </Stack>
    </Drawer>
  );
}
