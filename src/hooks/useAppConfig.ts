import { useMantineColorScheme } from "@mantine/core";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useRef, useState } from "react";
import { AppConfig, GameDefinition } from "../types";

export default function useAppConfig() {
  const { setColorScheme } = useMantineColorScheme();
  const [games, setGames] = useState<GameDefinition[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const configRef = useRef<AppConfig | null>(null);
  configRef.current = config;

  const activeGame =
    games.find((g) => g.id === config?.active_game_id) || games[0];
  const activeSettings =
    activeGame && config ? (config.games[activeGame.id] ?? {}) : {};
  const modsDir = activeSettings.mods_dir;
  const autoCategorize = config?.auto_categorize ?? true;
  const showNsfw = config?.show_nsfw ?? false;

  const load = useCallback(async () => {
    const [loadedGames, loadedConfig] = await Promise.all([
      invoke<GameDefinition[]>("get_games"),
      invoke<AppConfig>("get_config"),
    ]);
    setGames(loadedGames);
    setConfig(loadedConfig);
    setColorScheme(loadedConfig.color_scheme === "light" ? "light" : "dark");
    return { games: loadedGames, config: loadedConfig };
  }, [setColorScheme]);

  const updateColorScheme = useCallback(
    async (scheme: string) => {
      const updated = await invoke<AppConfig>("set_color_scheme", {
        colorScheme: scheme,
      });
      setConfig(updated);
      setColorScheme(scheme === "light" ? "light" : "dark");
    },
    [setColorScheme],
  );

  const setActiveGame = useCallback(async (gameId: string) => {
    const updated = await invoke<AppConfig>("set_active_game", { gameId });
    setConfig(updated);
    return updated;
  }, []);

  const setGameModsDir = useCallback(async (gameId: string, dir: string) => {
    const updated = await invoke<AppConfig>("set_game_mods_dir", {
      gameId,
      modsDir: dir,
    });
    setConfig(updated);
    return updated;
  }, []);

  const setNtePakGameDir = useCallback(async (gameDir: string) => {
    const updated = await invoke<AppConfig>("set_nte_pak_game_dir", {
      gameDir,
    });
    setConfig(updated);
    return updated;
  }, []);

  const setAutoCategorize = useCallback(async (auto: boolean) => {
    const updated = await invoke<AppConfig>("set_auto_categorize", {
      autoCategorize: auto,
    });
    setConfig(updated);
  }, []);

  const setShowNsfw = useCallback(async (value: boolean) => {
    const updated = await invoke<AppConfig>("set_show_nsfw", {
      showNsfw: value,
    });
    setConfig(updated);
  }, []);

  const setAutoCheckUpdates = useCallback(async (enabled: boolean) => {
    const updated = await invoke<AppConfig>("set_auto_check_updates", {
      autoCheckUpdates: enabled,
    });
    setConfig(updated);
  }, []);

  const setViewMode = useCallback(async (mode: "grid" | "list") => {
    const updated = await invoke<AppConfig>("set_view_mode", {
      viewMode: mode,
    });
    setConfig(updated);
  }, []);

  return {
    games,
    config,
    configRef,
    activeGame,
    activeSettings,
    modsDir,
    autoCategorize,
    showNsfw,
    load,
    updateColorScheme,
    setActiveGame,
    setGameModsDir,
    setNtePakGameDir,
    setAutoCategorize,
    setShowNsfw,
    setAutoCheckUpdates,
    setViewMode,
  };
}

export type AppConfigApi = ReturnType<typeof useAppConfig>;
