import { Box, Flex, LoadingOverlay } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GbModFile } from "./api/gamebanana";
import GbBrowserView from "./components/browser/GbBrowserView";
import CategoryModal from "./components/CategoryModal";
import ConflictDrawer from "./components/ConflictDrawer";
import { DownloadQueueDrawer } from "./components/DownloadQueueDrawer";
import { DuplicateModal } from "./components/DuplicateModal";
import Header from "./components/Header";
import KeybindDrawer from "./components/KeybindDrawer";
import ModGrid from "./components/ModGrid";
import SettingsView from "./components/SettingsView";
import Sidebar from "./components/Sidebar";
import {
  AppConfig,
  CategoryItem,
  ConflictGroup,
  DownloadProgressPayload,
  DownloadQueueItem,
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
  const [queueDrawerOpen, setQueueDrawerOpen] = useState<boolean>(false);
  const [downloadQueue, setDownloadQueue] = useState<DownloadQueueItem[]>([]);
  const [keybindDrawerMod, setKeybindDrawerMod] = useState<ModItem | null>(
    null,
  );
  const [duplicateModalState, setDuplicateModalState] = useState<{
    opened: boolean;
    file?: GbModFile;
    modName: string;
    gamebananaId: number;
    version?: string;
    categoryName?: string;
    previewUrl?: string;
    existingMod?: ModItem;
  } | null>(null);

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
    let unlistenStatus: (() => void) | null = null;
    let unlistenComplete: (() => void) | null = null;
    let unlistenError: (() => void) | null = null;

    async function setupListeners() {
      unlistenProgress = await listen<DownloadProgressPayload>(
        "download-progress",
        (event) => {
          setDownloadQueue((prev) =>
            prev.map((item) =>
              item.id === event.payload.key
                ? { ...item, progress: event.payload, status: "downloading" }
                : item,
            ),
          );
        },
      );

      unlistenStatus = await listen<{ key: string; status: string }>(
        "download-status",
        (event) => {
          if (event.payload.status === "extracting") {
            setDownloadQueue((prev) =>
              prev.map((item) =>
                item.id === event.payload.key
                  ? { ...item, status: "extracting" }
                  : item,
              ),
            );
          }
        },
      );

      unlistenComplete = await listen<{
        key: string;
        rel_id: string;
        mod_name: string;
      }>("download-complete", (event) => {
        setDownloadQueue((prev) =>
          prev.map((item) =>
            item.id === event.payload.key
              ? {
                  ...item,
                  status: "completed",
                  progress: { ...item.progress, percentage: 100 },
                }
              : item,
          ),
        );
        notifications.show({
          title: "Installation Complete",
          message: `${event.payload.mod_name} installed successfully.`,
          color: "green",
        });
        refreshData();
      });

      unlistenError = await listen<{ key: string; error: string }>(
        "download-error",
        (event) => {
          setDownloadQueue((prev) =>
            prev.map((item) =>
              item.id === event.payload.key
                ? { ...item, status: "failed", error: event.payload.error }
                : item,
            ),
          );
        },
      );
    }

    setupListeners();

    return () => {
      if (unlistenProgress) unlistenProgress();
      if (unlistenStatus) unlistenStatus();
      if (unlistenComplete) unlistenComplete();
      if (unlistenError) unlistenError();
    };
  }, [refreshData]);

  useEffect(() => {
    if (!modsDir) return;

    const activeCount = downloadQueue.filter(
      (item) => item.status === "downloading" || item.status === "extracting",
    ).length;

    if (activeCount >= 2) return;

    const nextItem = downloadQueue.find((item) => item.status === "queued");
    if (!nextItem) return;

    setDownloadQueue((prev) =>
      prev.map((item) =>
        item.id === nextItem.id ? { ...item, status: "downloading" } : item,
      ),
    );

    invoke("download_mod", {
      downloadUrl: nextItem.downloadUrl,
      modsDir,
      modName: nextItem.modName,
      category: nextItem.category,
      previewUrl: nextItem.previewUrl,
      key: nextItem.id,
      duplicateAction: nextItem.duplicateAction,
      itemId: nextItem.gamebananaId,
      fileId: nextItem.fileId,
      version: nextItem.version,
    }).catch((err) => {
      setDownloadQueue((prev) =>
        prev.map((item) =>
          item.id === nextItem.id
            ? { ...item, status: "failed", error: String(err) }
            : item,
        ),
      );
      notifications.show({
        title: "Download Failed",
        message: `${nextItem.modName}: ${String(err)}`,
        color: "red",
      });
    });
  }, [downloadQueue, modsDir]);

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

        const currentActiveId =
          loadedConfig.active_game_id || loadedGames[0]?.id;
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
      setSearchQuery("");
      const nextModsDir = updatedConfig.games[gameId]?.mods_dir;
      await refreshData(nextModsDir);
    } catch (err) {
      notifications.show({
        title: "Game Selection Error",
        message: String(err),
        color: "red",
      });
    }
  };

  const handleUpdateModsDir = async (newDir: string) => {
    if (!activeGame) return;
    try {
      const updatedConfig = await invoke<AppConfig>("set_game_mods_dir", {
        gameId: activeGame.id,
        modsDir: newDir,
      });
      setConfig(updatedConfig);
      await refreshData(newDir);
      notifications.show({
        title: "Settings Saved",
        message: "Mods directory path updated successfully.",
        color: "green",
      });
    } catch (err) {
      notifications.show({
        title: "Failed to Update Directory",
        message: String(err),
        color: "red",
      });
    }
  };

  const handleUpdateAutoCategorize = async (auto: boolean) => {
    if (!activeGame) return;
    try {
      const updatedConfig = await invoke<AppConfig>(
        "set_game_auto_categorize",
        {
          gameId: activeGame.id,
          autoCategorize: auto,
        },
      );
      setConfig(updatedConfig);
    } catch (err) {
      notifications.show({
        title: "Error",
        message: String(err),
        color: "red",
      });
    }
  };

  const handleToggleMod = async (modId: string, currentStatus: boolean) => {
    if (!modsDir) return;
    try {
      await invoke("toggle_mod", {
        modsDir,
        modId,
        enable: !currentStatus,
      });
      await refreshData();
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
      await invoke("move_mod", {
        modsDir,
        modId,
        targetCategory,
      });
      await refreshData();
      notifications.show({
        title: "Success",
        message: "Mod moved successfully.",
        color: "green",
      });
    } catch (err) {
      notifications.show({
        title: "Move Error",
        message: String(err),
        color: "red",
      });
    }
  };

  const handleCreateCategory = async (name: string) => {
    if (!modsDir) return;
    try {
      await invoke("create_new_category", {
        modsDir,
        categoryName: name,
      });
      await refreshData();
      notifications.show({
        title: "Category Created",
        message: `Category "${name}" created.`,
        color: "green",
      });
    } catch (err) {
      notifications.show({
        title: "Error",
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
      await refreshData();
      notifications.show({
        title: "Deleted",
        message: `${mod.name} removed from disk.`,
        color: "orange",
      });
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
        title: "Error",
        message: String(err),
        color: "red",
      });
    }
  };

  const addQueueItem = (
    file: GbModFile,
    modName: string,
    gamebananaId: number,
    version: string | undefined,
    categoryName: string | undefined,
    previewUrl: string | undefined,
    duplicateAction: "replace" | "keep_both",
  ) => {
    const key = String(file._idRow);
    const newItem: DownloadQueueItem = {
      id: key,
      modName,
      fileName: file._sFile,
      fileId: file._idRow,
      gamebananaId,
      version,
      category: categoryName,
      previewUrl,
      downloadUrl: file._sDownloadUrl,
      status: "queued",
      progress: {
        key,
        downloaded: 0,
        total: file._nFilesize,
        speed: "0 B/s",
        eta: "--",
        percentage: 0,
      },
      duplicateAction,
    };

    setDownloadQueue((prev) => [...prev.filter((i) => i.id !== key), newItem]);
    notifications.show({
      title: "Added to Download Queue",
      message: `${modName} (${file._sFile}) queued for download.`,
      color: "blue",
    });
  };

  const handleEnqueueDownload = (
    file: GbModFile,
    modName: string,
    gamebananaId: number,
    version?: string,
    categoryName?: string,
    previewUrl?: string,
  ) => {
    const existing = mods.find(
      (m) =>
        (m.gamebanana_id && m.gamebanana_id === gamebananaId) ||
        m.name.toLowerCase() === modName.toLowerCase() ||
        m.id.toLowerCase().endsWith(`/${modName.toLowerCase()}`),
    );

    if (existing) {
      setDuplicateModalState({
        opened: true,
        file,
        modName,
        gamebananaId,
        version,
        categoryName,
        previewUrl,
        existingMod: existing,
      });
    } else {
      addQueueItem(
        file,
        modName,
        gamebananaId,
        version,
        categoryName,
        previewUrl,
        "replace",
      );
    }
  };

  const handleClearCompleted = () => {
    setDownloadQueue((prev) => prev.filter((i) => i.status !== "completed"));
  };

  const handleCancelQueueItem = (id: string) => {
    setDownloadQueue((prev) => prev.filter((i) => i.id !== id));
  };

  const handleRetryQueueItem = (id: string) => {
    setDownloadQueue((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, status: "queued", error: undefined } : i,
      ),
    );
  };

  const filteredMods = useMemo(() => {
    return mods.filter((mod) => {
      const matchesCategory =
        selectedCategory === null ||
        (selectedCategory === "uncategorized"
          ? !mod.category
          : mod.category === selectedCategory);

      const matchesSearch =
        !searchQuery.trim() ||
        mod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mod.id.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [mods, selectedCategory, searchQuery]);

  const uncategorizedCount = mods.filter((m) => !m.category).length;

  const activeDownloadCount = downloadQueue.filter(
    (item) =>
      item.status === "queued" ||
      item.status === "downloading" ||
      item.status === "extracting",
  ).length;

  return (
    <Box
      h="100vh"
      w="100vw"
      style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        backgroundColor: "var(--color-bg-base)",
      }}
    >
      <LoadingOverlay visible={isLoading} />

      <Header
        games={games}
        activeGameId={config?.active_game_id || ""}
        onSelectGame={handleSelectGame}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        conflicts={conflicts}
        onOpenConflicts={() => setConflictDrawerOpen(true)}
        onRefresh={() => refreshData()}
        isRefreshing={isRefreshing}
        activeDownloadCount={activeDownloadCount}
        onOpenDownloadQueue={() => setQueueDrawerOpen(true)}
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
                onOpenKeybinds={setKeybindDrawerMod}
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
              downloadQueue={downloadQueue}
              onEnqueueDownload={handleEnqueueDownload}
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

      <DownloadQueueDrawer
        opened={queueDrawerOpen}
        onClose={() => setQueueDrawerOpen(false)}
        queue={downloadQueue}
        onClearCompleted={handleClearCompleted}
        onCancelItem={handleCancelQueueItem}
        onRetryItem={handleRetryQueueItem}
      />

      <KeybindDrawer
        opened={Boolean(keybindDrawerMod)}
        onClose={() => setKeybindDrawerMod(null)}
        mod={keybindDrawerMod}
        modsDir={modsDir}
      />

      {duplicateModalState && (
        <DuplicateModal
          opened={duplicateModalState.opened}
          onClose={() => setDuplicateModalState(null)}
          modName={duplicateModalState.modName}
          existingMod={duplicateModalState.existingMod}
          onConfirm={(action) => {
            if (duplicateModalState.file) {
              addQueueItem(
                duplicateModalState.file,
                duplicateModalState.modName,
                duplicateModalState.gamebananaId,
                duplicateModalState.version,
                duplicateModalState.categoryName,
                duplicateModalState.previewUrl,
                action,
              );
            }
          }}
        />
      )}

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
