import { notifications } from "@mantine/notifications";
import { listen } from "@tauri-apps/api/event";
import { Dispatch, SetStateAction, useEffect } from "react";
import {
  DownloadCompletePayload,
  DownloadErrorPayload,
  DownloadProgressPayload,
  DownloadQueueItem,
  DownloadStatusPayload,
} from "../types";

interface UseDownloadListenersArgs {
  setDownloadQueue: Dispatch<SetStateAction<DownloadQueueItem[]>>;
  refreshRef: { current: () => Promise<void> | void };
}

export default function useDownloadListeners({
  setDownloadQueue,
  refreshRef,
}: UseDownloadListenersArgs) {
  useEffect(() => {
    let disposed = false;
    const unlisten: Array<() => void> = [];

    void (async () => {
      const handlers = await Promise.all([
        listen<DownloadProgressPayload>("download-progress", (event) => {
          setDownloadQueue((prev) =>
            prev.map((item) =>
              item.id === event.payload.key
                ? { ...item, progress: event.payload, status: "downloading" }
                : item,
            ),
          );
        }),
        listen<DownloadStatusPayload>("download-status", (event) => {
          if (event.payload.status === "extracting") {
            setDownloadQueue((prev) =>
              prev.map((item) =>
                item.id === event.payload.key
                  ? { ...item, status: "extracting" }
                  : item,
              ),
            );
          }
        }),
        listen<DownloadCompletePayload>("download-complete", (event) => {
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
            title: "Installation complete",
            message: `${event.payload.mod_name} installed successfully.`,
            color: "green",
          });
          refreshRef.current();
        }),
        listen<DownloadErrorPayload>("download-error", (event) => {
          setDownloadQueue((prev) =>
            prev.map((item) =>
              item.id === event.payload.key
                ? { ...item, status: "failed", error: event.payload.error }
                : item,
            ),
          );
        }),
      ]);

      if (disposed) {
        handlers.forEach((un) => un());
        return;
      }
      unlisten.push(...handlers);
    })();

    return () => {
      disposed = true;
      unlisten.forEach((un) => un());
    };
  }, [setDownloadQueue, refreshRef]);
}
