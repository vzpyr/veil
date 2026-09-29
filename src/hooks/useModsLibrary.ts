import { notifications } from "@mantine/notifications";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useState } from "react";
import { checkModsUpdates } from "../api/updater";
import {
  AppConfig,
  CategoryItem,
  ConflictGroup,
  LibraryData,
  ModItem,
  ModUpdateInfo,
} from "../types";
import { detectConflicts } from "../utils";

interface UseModsLibraryArgs {
  configRef: { current: AppConfig | null };
  activeGameId?: string;
  modsDir?: string;
}

export default function useModsLibrary({
  configRef,
  activeGameId,
  modsDir,
}: UseModsLibraryArgs) {
  const [mods, setMods] = useState<ModItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [conflicts, setConflicts] = useState<ConflictGroup[]>([]);
  const [updatesMap, setUpdatesMap] = useState<Record<string, ModUpdateInfo>>(
    {},
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);

  const refreshData = useCallback(
    async (
      targetModsDir?: string,
      activeConfig?: AppConfig | null,
      overrideGameId?: string,
    ) => {
      const cfg = activeConfig ?? configRef.current;
      const targetGameId =
        overrideGameId || cfg?.active_game_id || activeGameId;
      const targetDir =
        targetModsDir !== undefined
          ? targetModsDir
          : targetGameId
            ? cfg?.games[targetGameId]?.dir
            : modsDir;
      if (!targetDir) {
        setMods([]);
        setCategories([]);
        setConflicts([]);
        return;
      }

      try {
        setIsRefreshing(true);
        const data = await invoke<LibraryData>("get_library_data", {
          modsDir: targetDir,
          gameId: targetGameId,
        });

        setMods(data.mods);
        setCategories(data.categories);
        setConflicts(data.conflicts);

        const shouldAutoCheck = Boolean(
          (activeConfig ?? configRef.current)?.auto_check_updates,
        );
        if (shouldAutoCheck) {
          checkModsUpdates(data.mods).then((updates) => {
            setUpdatesMap(updates);
          });
        }
      } catch (err) {
        notifications.show({
          title: "Scanning error",
          message: String(err),
          color: "red",
        });
      } finally {
        setIsRefreshing(false);
      }
    },
    [activeGameId, modsDir, configRef],
  );

  const setLocalModEnabled = useCallback(
    (modIds: string[], enable: boolean) => {
      const idSet = new Set(modIds);
      setMods((prev) => {
        const next = prev.map((m) =>
          idSet.has(m.id) ? { ...m, enabled: enable } : m,
        );
        setConflicts(detectConflicts(next));
        return next;
      });
    },
    [],
  );

  const setLocalModPreview = useCallback(
    (modId: string, previewPath: string) => {
      setMods((prev) =>
        prev.map((m) =>
          m.id === modId ? { ...m, preview_path: previewPath } : m,
        ),
      );
    },
    [],
  );

  const rescanMods = useCallback(async () => {
    if (!modsDir) return;
    try {
      await invoke("cleanup_on_boot", { modsDir, gameId: activeGameId });
      await refreshData();
      notifications.show({
        title: "Scan complete",
        message: "Mods directory rescanned successfully.",
        color: "green",
      });
    } catch (err) {
      notifications.show({
        title: "Scan error",
        message: String(err),
        color: "red",
      });
    }
  }, [modsDir, activeGameId, refreshData]);

  const checkUpdates = useCallback(async () => {
    if (mods.length === 0) return;
    try {
      setIsCheckingUpdates(true);
      const updates = await checkModsUpdates(mods);
      setUpdatesMap(updates);
      const availableCount = Object.values(updates).filter(
        (u) => u.available,
      ).length;
      if (availableCount > 0) {
        notifications.show({
          title: "Updates available",
          message: `Found ${availableCount} mod update${availableCount > 1 ? "s" : ""}.`,
          color: "teal",
        });
      } else {
        notifications.show({
          title: "Up to date",
          message: "All linked mods are up to date.",
          color: "green",
        });
      }
    } catch (err) {
      notifications.show({
        title: "Update check failed",
        message: String(err),
        color: "red",
      });
    } finally {
      setIsCheckingUpdates(false);
    }
  }, [mods]);

  return {
    mods,
    categories,
    conflicts,
    updatesMap,
    isRefreshing,
    isCheckingUpdates,
    refreshData,
    setLocalModEnabled,
    setLocalModPreview,
    rescanMods,
    checkUpdates,
  };
}

export type ModsLibrary = ReturnType<typeof useModsLibrary>;
