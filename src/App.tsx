import { Box, Flex, LoadingOverlay } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { useCallback, useEffect, useState } from "react";
import GbBrowserView from "./components/browser/GbBrowserView";
import CategoryModal from "./components/CategoryModal";
import ConflictDrawer from "./components/ConflictDrawer";
import Header from "./components/Header";
import ModGrid from "./components/ModGrid";
import SettingsView from "./components/SettingsView";
import Sidebar from "./components/Sidebar";
import {
  AppConfig,
  CategoryItem,
  ConflictGroup,
  DownloadProgressPayload,
  GameDefinition,
  ModItem,
} from "./types";

export default function App() {
  const [games, setGames] = useState<GameDefinition[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [mods, setMods] = useState<ModItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [conflicts, setConflicts] = useState<ConflictGroup[]>([]);
  const [activeTab, setActiveTab] = useState<string>("installed");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [conflictDrawerOpen, setConflictDrawerOpen] = useState<boolean>(false);
  const [activeDownloads, setActiveDownloads] = useState<
    Record<string, DownloadProgressPayload>
  >({});
  const [categoryModal, setCategoryModal] = useState<{
    open: boolean;
    modToMove?: ModItem | null;
  }>({ open: false, modToMove: null });

  const activeGame =
    games.find((g) => g.id === config?.active_game_id) || games[0];
  const activeSettings =
    activeGame && config ? config.games[activeGame.id] : undefined;
  const modsDir = activeSettings?.mods_dir;
  const autoCategorize = activeSettings?.auto_categorize ?? true;

  const refreshData = useCallback(
    async (dir?: string) => {
      const targetDir = dir ?? modsDir;
      if (!targetDir) {
        setMods([]);
        setCategories([]);
        setConflicts([]);
        return;
      }

      try {
        setIsRefreshing(true);
        const [scannedMods, catList, conflictList] = await Promise.all([
          invoke<ModItem[]>("scan_installed_mods", { modsDir: targetDir }),
          invoke<CategoryItem[]>("get_categories", { modsDir: targetDir }),
          invoke<ConflictGroup[]>("get_mod_conflicts", { modsDir: targetDir }),
        ]);
        setMods(scannedMods);
        setCategories(catList);
        setConflicts(conflictList);
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
    [modsDir],
  );

  useEffect(() => {
    let unlistenProgress: (() => void) | null = null;
    let unlistenComplete: (() => void) | null = null;

    async function setupListeners() {
      unlistenProgress = await listen<DownloadProgressPayload>(
        "download-progress",
        (event) => {
          setActiveDownloads((prev) => ({
            ...prev,
            [event.payload.key]: event.payload,
          }));
        },
      );

      unlistenComplete = await listen<{
        key: string;
        rel_id: string;
        mod_name: string;
      }>("download-complete", (event) => {
        setActiveDownloads((prev) => {
          const next = { ...prev };
          delete next[event.payload.key];
          return next;
        });
        refreshData();
      });
    }

    setupListeners();

    return () => {
      if (unlistenProgress) unlistenProgress();
      if (unlistenComplete) unlistenComplete();
    };
  }, [refreshData]);

  useEffect(() => {
    async function initialize() {
      try {
        setIsLoading(true);
        const [loadedGames, loadedConfig] = await Promise.all([
          invoke<GameDefinition[]>("get_games"),
          invoke<AppConfig>("get_config"),
        ]);
        setGames(loadedGames);
        setConfig(loadedConfig);

        const currentActiveId = loadedConfig.active_game_id;
        const currentModsDir = loadedConfig.games[currentActiveId]?.mods_dir;
        if (currentModsDir) {
          await refreshData(currentModsDir);
        }
      } catch (err) {
        notifications.show({
          title: "Initialization Error",
          message: String(err),
          color: "red",
        });
      } finally {
        setIsLoading(false);
      }
    }
    initialize();
  }, [refreshData]);

  const handleSelectGame = async (gameId: string) => {
    try {
      const updatedConfig = await invoke<AppConfig>("set_active_game", {
        gameId,
      });
      setConfig(updatedConfig);
      setSelectedCategory(null);
      const targetDir = updatedConfig.games[gameId]?.mods_dir;
      await refreshData(targetDir);
    } catch (err) {
      notifications.show({
        title: "Failed to Switch Game",
        message: String(err),
        color: "red",
      });
    }
  };

  const handleUpdateModsDir = async (dir: string) => {
    if (!activeGame) return;
    try {
      const updatedConfig = await invoke<AppConfig>("set_game_mods_dir", {
        gameId: activeGame.id,
        modsDir: dir,
      });
      setConfig(updatedConfig);
      notifications.show({
        title: "Directory Saved",
        message: "Mods directory updated successfully.",
        color: "green",
      });
      await refreshData(dir);
    } catch (err) {
      notifications.show({
        title: "Directory Error",
        message: String(err),
        color: "red",
      });
    }
  };

  const handleUpdateAutoCategorize = async (enabled: boolean) => {
    if (!activeGame) return;
    try {
      const updatedConfig = await invoke<AppConfig>(
        "set_game_auto_categorize",
        {
          gameId: activeGame.id,
          autoCategorize: enabled,
        },
      );
      setConfig(updatedConfig);
    } catch (err) {
      notifications.show({
        title: "Settings Error",
        message: String(err),
        color: "red",
      });
    }
  };

  const handleToggleMod = async (modId: string, enable: boolean) => {
    if (!modsDir) return;
    try {
      await invoke<boolean>("toggle_mod", {
        modsDir,
        modId,
        enable,
      });
      setMods((prev) =>
        prev.map((m) => (m.id === modId ? { ...m, enabled: enable } : m)),
      );

      const conflictList = await invoke<ConflictGroup[]>("get_mod_conflicts", {
        modsDir,
      });
      setConflicts(conflictList);
    } catch (err) {
      notifications.show({
        title: "Toggle Error",
        message: String(err),
        color: "red",
      });
    }
  };

  const handleMoveMod = async (
    modId: string,
    targetCategory: string | null,
  ) => {
    if (!modsDir) return;
    try {
      await invoke<string>("move_mod", {
        modsDir,
        modId,
        targetCategory: targetCategory || null,
      });
      notifications.show({
        title: "Mod Moved",
        message: "Mod successfully moved to target category.",
        color: "green",
      });
      await refreshData();
    } catch (err) {
      notifications.show({
        title: "Move Error",
        message: String(err),
        color: "red",
      });
    }
  };

  const handleCreateCategory = async (categoryName: string) => {
    if (!modsDir) return;
    try {
      await invoke("create_new_category", {
        modsDir,
        categoryName,
      });
      notifications.show({
        title: "Category Created",
        message: `Category ${categoryName} created successfully.`,
        color: "green",
      });
      await refreshData();
    } catch (err) {
      notifications.show({
        title: "Category Creation Error",
        message: String(err),
        color: "red",
      });
    }
  };

  const handleDeleteMod = async (mod: ModItem) => {
    if (!modsDir) return;
    try {
      await invoke("delete_installed_mod", {
        modsDir,
        modId: mod.id,
      });
      notifications.show({
        title: "Mod Deleted",
        message: `${mod.name} was deleted successfully.`,
        color: "green",
      });
      await refreshData();
    } catch (err) {
      notifications.show({
        title: "Delete Error",
        message: String(err),
        color: "red",
      });
    }
  };

  const handleReveal = async (folderPath: string) => {
    try {
      await revealItemInDir(folderPath);
    } catch (err) {
      notifications.show({
        title: "Error Opening Folder",
        message: String(err),
        color: "red",
      });
    }
  };

  const filteredMods = mods.filter((mod) => {
    if (selectedCategory === "__root__") {
      if (mod.category !== null && mod.category !== undefined) {
        return false;
      }
    } else if (selectedCategory !== null) {
      if (mod.category !== selectedCategory) {
        return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = mod.name.toLowerCase().includes(q);
      const matchCat = mod.category?.toLowerCase().includes(q) ?? false;
      if (!matchName && !matchCat) {
        return false;
      }
    }

    return true;
  });

  const uncategorizedCount = mods.filter((m) => !m.category).length;

  return (
    <Box
      h="100vh"
      w="100vw"
      style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}
    >
      <LoadingOverlay visible={isLoading} />

      <Header
        games={games}
        activeGameId={activeGame?.id || "zzz"}
        onSelectGame={handleSelectGame}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        conflicts={conflicts}
        onOpenConflicts={() => setConflictDrawerOpen(true)}
        onRefresh={() => refreshData()}
        isRefreshing={isRefreshing}
      />

      <Flex style={{ flex: 1, overflow: "hidden" }}>
        {activeTab === "installed" && (
          <>
            <Sidebar
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              totalModsCount={mods.length}
              uncategorizedCount={uncategorizedCount}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpenCreateCategory={() =>
                setCategoryModal({ open: true, modToMove: null })
              }
            />

            <Box
              style={{
                flex: 1,
                overflowY: "auto",
                backgroundColor: "var(--color-bg-base)",
              }}
            >
              <ModGrid
                mods={filteredMods}
                hasModsDir={Boolean(modsDir)}
                conflicts={conflicts}
                onToggle={handleToggleMod}
                onMoveCategory={(mod) =>
                  setCategoryModal({ open: true, modToMove: mod })
                }
                onReveal={handleReveal}
                onDelete={handleDeleteMod}
                onOpenConflicts={() => setConflictDrawerOpen(true)}
                onOpenSettings={() => setActiveTab("settings")}
              />
            </Box>
          </>
        )}

        {activeTab === "browser" && activeGame && (
          <Box
            style={{
              flex: 1,
              overflowY: "auto",
              backgroundColor: "var(--color-bg-base)",
            }}
          >
            <GbBrowserView
              activeGame={activeGame}
              modsDir={modsDir}
              autoCategorize={autoCategorize}
              activeDownloads={activeDownloads}
              onInstallSuccess={() => refreshData()}
            />
          </Box>
        )}

        {activeTab === "settings" && activeGame && activeSettings && (
          <Box
            style={{
              flex: 1,
              overflowY: "auto",
              backgroundColor: "var(--color-bg-base)",
            }}
          >
            <SettingsView
              activeGame={activeGame}
              settings={activeSettings}
              onUpdateModsDir={handleUpdateModsDir}
              onUpdateAutoCategorize={handleUpdateAutoCategorize}
            />
          </Box>
        )}
      </Flex>

      <ConflictDrawer
        opened={conflictDrawerOpen}
        onClose={() => setConflictDrawerOpen(false)}
        conflicts={conflicts}
        allMods={mods}
        onToggleMod={handleToggleMod}
      />

      <CategoryModal
        opened={categoryModal.open}
        onClose={() => setCategoryModal({ open: false, modToMove: null })}
        categories={categories}
        modToMove={categoryModal.modToMove}
        onMoveMod={handleMoveMod}
        onCreateCategory={handleCreateCategory}
      />
    </Box>
  );
}
