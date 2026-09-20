import { notifications } from "@mantine/notifications";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useState } from "react";

interface UseManualInstallArgs {
  modsDir?: string;
  activeGameId?: string;
  refreshData: () => Promise<void> | void;
}

export default function useManualInstall({
  modsDir,
  activeGameId,
  refreshData,
}: UseManualInstallArgs) {
  const [modalOpen, setModalOpen] = useState(false);
  const [archivePaths, setArchivePaths] = useState<string[]>([]);
  const [isInstalling, setIsInstalling] = useState(false);

  const openPicker = async () => {
    if (!modsDir) {
      notifications.show({
        title: "No Mods Directory",
        message:
          "Please configure your mods directory in Settings before installing mods.",
        color: "yellow",
      });
      return;
    }
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: "Mod Archives",
            extensions: ["zip", "7z", "rar"],
          },
        ],
      });
      if (selected) {
        const paths = Array.isArray(selected)
          ? selected
          : typeof selected === "string"
            ? [selected]
            : [];
        if (paths.length > 0) {
          setArchivePaths(paths);
          setModalOpen(true);
        }
      }
    } catch (err) {
      notifications.show({
        title: "Selection Error",
        message: String(err),
        color: "red",
      });
    }
  };

  const confirm = async (
    modName: string,
    category: string | null,
    duplicateAction: string,
  ) => {
    if (!modsDir || archivePaths.length === 0) return;
    try {
      setIsInstalling(true);
      const isMultiple = archivePaths.length > 1;
      for (const archivePath of archivePaths) {
        const targetName = isMultiple
          ? (archivePath.split(/[/\\]/).pop() || "").replace(
              /\.(zip|7z|rar|tar|gz)$/i,
              "",
            )
          : modName;
        await invoke("extract_archive_file", {
          archivePath,
          modsDir,
          modName: targetName,
          category,
          duplicateAction,
          gameId: activeGameId,
        });
      }
      await refreshData();
      notifications.show({
        title: "Installation Complete",
        message: isMultiple
          ? `Installed ${archivePaths.length} mods successfully.`
          : `${modName} installed successfully.`,
        color: "green",
      });
    } catch (err) {
      notifications.show({
        title: "Extraction Error",
        message: String(err),
        color: "red",
      });
    } finally {
      setIsInstalling(false);
    }
  };

  return {
    modalOpen,
    setModalOpen,
    archivePaths,
    isInstalling,
    openPicker,
    confirm,
  };
}

export type ManualInstall = ReturnType<typeof useManualInstall>;
