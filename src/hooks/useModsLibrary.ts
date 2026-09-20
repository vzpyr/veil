import { notifications } from "@mantine/notifications";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useState } from "react";
import { checkModsUpdates } from "../api/updater";
import {
  AppConfig,
  CategoryItem,
  ConflictGroup,
  ModItem,
  ModUpdateInfo,
} from "../types";

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
        const [scannedMods, catList, conflictList] = await Promise.all([
          invoke<ModItem[]>("scan_mods", {
            modsDir: targetDir,
            gameId: targetGameId,
          }),
          invoke<CategoryItem[]>("get_categories", {
            modsDir: targetDir,
            gameId: targetGameId,
          }),
          invoke<ConflictGroup[]>("get_mod_conflicts", {
            modsDir: targetDir,
            gameId: targetGameId,
          }),
        ]);
        setMods(scannedMods);
        setCategories(catList);
        setConflicts(conflictList);

        const shouldAutoCheck = Boolean(
          (activeConfig ?? configRef.current)?.auto_check_updates,
        );
        if (shouldAutoCheck) {
          checkModsUpdates(scannedMods).then((updates) => {
            setUpdatesMap(updates);
          });
        }
      } catch (err) {
        notifications.show({
          title: "Scanning Error",
          message: String(err),
          color: "red",
        });
      } finally {
        setIsRefreshing(false);
      }
    },
    [activeGameId, modsDir, configRef],
  );

  const rescanMods = useCallback(async () => {
    if (!modsDir) return;
    try {
      await invoke("cleanup_on_boot", { modsDir, gameId: activeGameId });
      await refreshData();
      notifications.show({
        title: "Scan Complete",
        message: "Mods directory rescanned successfully.",
        color: "green",
      });
    } catch (err) {
      notifications.show({
        title: "Scan Error",
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
          title: "Updates Available",
          message: `Found ${availableCount} mod update${availableCount > 1 ? "s" : ""}.`,
          color: "teal",
        });
      } else {
        notifications.show({
          title: "Up to Date",
          message: "All linked mods are up to date.",
          color: "green",
        });
      }
    } catch (err) {
      notifications.show({
        title: "Update Check Failed",
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
    rescanMods,
    checkUpdates,
  };
}

export type ModsLibrary = ReturnType<typeof useModsLibrary>;
