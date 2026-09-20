import { Box, Flex, LoadingOverlay } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { invoke } from "@tauri-apps/api/core";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { tabContent } from "./motion";
import Header from "./components/Header";
import InstalledView from "./components/InstalledView";
import AppDrawers from "./components/AppDrawers";
import NtePakLoaderView from "./components/NtePakLoaderView";
import SettingsView from "./components/SettingsView";
import GbBrowserView from "./components/browser/GbBrowserView";
import useAppConfig from "./hooks/useAppConfig";
import useAppUi from "./hooks/useAppUi";
import useDownloads from "./hooks/useDownloads";
import useManualInstall from "./hooks/useManualInstall";
import useModFilters from "./hooks/useModFilters";
import useModOperations from "./hooks/useModOperations";
import useModsLibrary from "./hooks/useModsLibrary";

export default function App() {
  const config = useAppConfig();
  const ui = useAppUi();
  const mods = useModsLibrary({
    configRef: config.configRef,
    activeGameId: config.activeGame?.id,
    modsDir: config.modsDir,
  });
  const ops = useModOperations({
    activeGameId: config.activeGame?.id,
    modsDir: config.modsDir,
    refreshData: mods.refreshData,
  });
  const downloads = useDownloads({
    mods: mods.mods,
    modsDir: config.modsDir,
    activeGameId: config.activeGame?.id,
    refreshData: mods.refreshData,
  });
  const manual = useManualInstall({
    modsDir: config.modsDir,
    activeGameId: config.activeGame?.id,
    refreshData: mods.refreshData,
  });
  const filters = useModFilters({
    mods: mods.mods,
    selectedCategory: ui.selectedCategory,
    searchQuery: ui.searchQuery,
    statusFilter: ui.statusFilter,
    sortBy: ui.sortBy,
  });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      ui.setIsLoading(true);
      try {
        const { games: loadedGames, config: loadedConfig } =
          await config.load();
        const currentActiveId =
          loadedConfig.active_game_id || loadedGames[0]?.id;
        const currentModsDir = loadedConfig.games[currentActiveId]?.dir;
        if (currentModsDir) {
          await invoke("cleanup_on_boot", {
            modsDir: currentModsDir,
            gameId: currentActiveId,
          });
          await mods.refreshData(currentModsDir, loadedConfig, currentActiveId);
        }
      } catch (err) {
        notifications.show({
          title: "Initialization error",
          message: String(err),
          color: "red",
        });
      } finally {
        if (!cancelled) {
          ui.setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectGame = async (gameId: string) => {
    try {
      if (ui.activeTab === "loader" && gameId !== "ntepak") {
        ui.setActiveTab("installed");
      }
      const updatedConfig = await config.setActiveGame(gameId);
      ui.setSelectedCategory(null);
      ui.setSearchQuery("");
      const nextModsDir = updatedConfig.games[gameId]?.dir;
      if (nextModsDir) {
        await invoke("cleanup_on_boot", { modsDir: nextModsDir, gameId });
      }
      await mods.refreshData(nextModsDir, updatedConfig, gameId);
    } catch (err) {
      notifications.show({
        title: "Game selection error",
        message: String(err),
        color: "red",
      });
    }
  };

  const handleUpdateModsDir = async (newDir: string) => {
    if (!config.activeGame) return;
    try {
      const updatedConfig = await config.setGameDir(
        config.activeGame.id,
        newDir,
      );
      await mods.refreshData(newDir);
      notifications.show({
        title: "Settings saved",
        message: "Mods directory path updated successfully.",
        color: "green",
      });
    } catch (err) {
      notifications.show({
        title: "Settings error",
        message: String(err),
        color: "red",
      });
    }
  };

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
      <LoadingOverlay visible={ui.isLoading} />

      <Header
        games={config.games}
        activeGameId={config.config?.active_game_id || ""}
        onSelectGame={handleSelectGame}
        activeTab={ui.activeTab}
        onSelectTab={ui.setActiveTab}
        activeDownloadCount={downloads.activeDownloadCount}
        onOpenDownloadQueue={() => ui.setQueueDrawerOpen(true)}
      />

      <Flex style={{ flex: 1, overflow: "hidden" }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={ui.activeTab}
            variants={tabContent}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              flex: 1,
              display: "flex",
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            {ui.activeTab === "installed" && (
              <InstalledView
                config={config}
                mods={mods}
                ops={ops}
                ui={ui}
                filters={filters}
                manual={manual}
              />
            )}

            {ui.activeTab === "loader" &&
              config.activeGame?.id === "ntepak" && (
                <Box
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    backgroundColor: "var(--color-bg-base)",
                  }}
                >
                  <NtePakLoaderView
                    gameDir={config.modsDir}
                    onNavigateToSettings={() => ui.setActiveTab("settings")}
                  />
                </Box>
              )}

            {ui.activeTab === "browser" && config.activeGame && (
              <Box
                style={{
                  flex: 1,
                  overflowY: "auto",
                  backgroundColor: "var(--color-bg-base)",
                }}
              >
                <GbBrowserView
                  activeGame={config.activeGame}
                  modsDir={config.modsDir}
                  autoCategorize={config.autoCategorize}
                  showNsfw={config.showNsfw}
                  downloadQueue={downloads.downloadQueue}
                  onEnqueueDownload={downloads.enqueueDownload}
                />
              </Box>
            )}

            {ui.activeTab === "settings" && config.activeGame && (
              <Box
                style={{
                  flex: 1,
                  overflowY: "auto",
                  backgroundColor: "var(--color-bg-base)",
                }}
              >
                <SettingsView
                  activeGame={config.activeGame}
                  settings={config.activeSettings}
                  autoCategorize={config.autoCategorize}
                  showNsfw={config.showNsfw}
                  autoCheckUpdates={Boolean(config.config?.auto_check_updates)}
                  colorScheme={config.config?.color_scheme ?? "system"}
                  onUpdateDir={handleUpdateModsDir}
                  onUpdateAutoCategorize={config.setAutoCategorize}
                  onShowNsfwChange={config.setShowNsfw}
                  onUpdateAutoCheckUpdates={config.setAutoCheckUpdates}
                  onColorSchemeChange={config.updateColorScheme}
                />
              </Box>
            )}
          </motion.div>
        </AnimatePresence>
      </Flex>

      <AppDrawers
        config={config}
        mods={mods}
        ops={ops}
        ui={ui}
        downloads={downloads}
        manual={manual}
      />
    </Box>
  );
}
