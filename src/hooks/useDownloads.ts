import { notifications } from "@mantine/notifications";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { GbModFile } from "../api/gamebanana";
import { DownloadQueueItem, ModItem } from "../types";
import useDownloadListeners from "./useDownloadListeners";

interface DuplicateModalState {
  opened: boolean;
  file?: GbModFile;
  modName: string;
  gamebananaId: number;
  version?: string;
  categoryName?: string;
  previewUrl?: string;
  existingMod?: ModItem;
}

interface UseDownloadsArgs {
  mods: ModItem[];
  modsDir?: string;
  activeGameId?: string;
  refreshData: () => Promise<void> | void;
}

export default function useDownloads({
  mods,
  modsDir,
  activeGameId,
  refreshData,
}: UseDownloadsArgs) {
  const [downloadQueue, setDownloadQueue] = useState<DownloadQueueItem[]>([]);
  const [duplicateModalState, setDuplicateModalState] =
    useState<DuplicateModalState | null>(null);

  const refreshRef = useRef(refreshData);
  useEffect(() => {
    refreshRef.current = refreshData;
  }, [refreshData]);

  useDownloadListeners({ setDownloadQueue, refreshRef });

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
      gameId: activeGameId,
    }).catch((err) => {
      setDownloadQueue((prev) =>
        prev.map((item) =>
          item.id === nextItem.id
            ? { ...item, status: "failed", error: String(err) }
            : item,
        ),
      );
      if (String(err).includes("cancelled")) return;
      notifications.show({
        title: "Download Failed",
        message: `${nextItem.modName}: ${String(err)}`,
        color: "red",
      });
    });
  }, [downloadQueue, modsDir, activeGameId]);

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
      color: "gray",
    });
  };

  const enqueueDownload = (
    file: GbModFile,
    modName: string,
    gamebananaId: number,
    version?: string,
    categoryName?: string,
    previewUrl?: string,
  ) => {
    const key = String(file._idRow);
    if (
      downloadQueue.some(
        (i) =>
          i.id === key && i.status !== "completed" && i.status !== "failed",
      )
    ) {
      return;
    }

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

  const clearCompleted = () => {
    setDownloadQueue((prev) => prev.filter((i) => i.status !== "completed"));
  };

  const cancelItem = (id: string) => {
    setDownloadQueue((prev) => prev.filter((i) => i.id !== id));
    invoke("cancel_download", { key: id }).catch(() => {});
  };

  const retryItem = (id: string) => {
    setDownloadQueue((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, status: "queued", error: undefined } : i,
      ),
    );
  };

  const closeDuplicate = () => setDuplicateModalState(null);

  const confirmDuplicate = (action: "replace" | "keep_both") => {
    if (!duplicateModalState?.file) return;
    addQueueItem(
      duplicateModalState.file,
      duplicateModalState.modName,
      duplicateModalState.gamebananaId,
      duplicateModalState.version,
      duplicateModalState.categoryName,
      duplicateModalState.previewUrl,
      action,
    );
  };

  const activeDownloadCount = useMemo(
    () =>
      downloadQueue.filter(
        (item) =>
          item.status === "queued" ||
          item.status === "downloading" ||
          item.status === "extracting",
      ).length,
    [downloadQueue],
  );

  return {
    downloadQueue,
    activeDownloadCount,
    addQueueItem,
    enqueueDownload,
    clearCompleted,
    cancelItem,
    retryItem,
    duplicateModalState,
    closeDuplicate,
    confirmDuplicate,
  };
}

export type Downloads = ReturnType<typeof useDownloads>;
