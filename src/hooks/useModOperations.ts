import { notifications } from "@mantine/notifications";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { AppConfig, ModItem } from "../types";

type RefreshData = (
  targetModsDir?: string,
  activeConfig?: AppConfig | null,
  overrideGameId?: string,
) => Promise<void>;

interface UseModOperationsArgs {
  activeGameId?: string;
  modsDir?: string;
  refreshData: RefreshData;
}

export default function useModOperations({
  activeGameId,
  modsDir,
  refreshData,
}: UseModOperationsArgs) {
  const toggleMods = async (modIds: string[], enable: boolean) => {
    if (!modsDir || modIds.length === 0) return;
    try {
      await invoke("batch_toggle_mods", {
        modsDir,
        modIds,
        enable,
        gameId: activeGameId,
      });
      await refreshData();
      notifications.show({
        title: enable ? "Mods enabled" : "Mods disabled",
        message:
          modIds.length === 1
            ? `Mod ${enable ? "enabled" : "disabled"}.`
            : `${modIds.length} mods ${enable ? "enabled" : "disabled"}.`,
        color: "green",
      });
    } catch (err) {
      notifications.show({
        title: "Toggle error",
        message: String(err),
        color: "red",
      });
    }
  };

  const toggleMod = async (modId: string, enable: boolean) => {
    await toggleMods([modId], enable);
  };

  const moveMods = async (
    modIds: string[],
    targetCategory: string | null,
    onSuccess?: () => void,
  ) => {
    if (!modsDir || modIds.length === 0) return;
    try {
      await invoke("batch_move_mods", {
        modsDir,
        modIds,
        targetCategory,
        gameId: activeGameId,
      });
      await refreshData();
      onSuccess?.();
      notifications.show({
        title: "Mods moved",
        message:
          modIds.length === 1
            ? "Mod moved successfully."
            : `${modIds.length} mods moved successfully.`,
        color: "green",
      });
    } catch (err) {
      notifications.show({
        title: "Move error",
        message: String(err),
        color: "red",
      });
    }
  };

  const moveMod = async (modId: string, targetCategory: string | null) => {
    await moveMods([modId], targetCategory);
  };

  const deleteMods = async (modsToDelete: ModItem[]) => {
    if (!modsDir || modsToDelete.length === 0) return;
    try {
      await invoke("batch_delete_mods", {
        modsDir,
        modIds: modsToDelete.map((m) => m.id),
        gameId: activeGameId,
      });
      await refreshData();
      notifications.show({
        title: "Mods deleted",
        message:
          modsToDelete.length === 1
            ? `${modsToDelete[0].name} removed from disk.`
            : `${modsToDelete.length} mods removed from disk.`,
        color: "orange",
      });
    } catch (err) {
      notifications.show({
        title: "Delete failed",
        message: String(err),
        color: "red",
      });
    }
  };

  const deleteMod = async (mod: ModItem) => {
    await deleteMods([mod]);
  };

  const createCategory = async (name: string) => {
    if (!modsDir) return;
    try {
      await invoke("create_category", {
        modsDir,
        categoryName: name,
        gameId: activeGameId,
      });
      await refreshData();
      notifications.show({
        title: "Category created",
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

  const renameCategory = async (oldName: string, newName: string) => {
    if (!modsDir) return;
    try {
      await invoke("rename_category", {
        modsDir,
        oldName,
        newName,
        gameId: activeGameId,
      });
      await refreshData();
      notifications.show({
        title: "Category renamed",
        message: `Category "${oldName}" renamed to "${newName}".`,
        color: "green",
      });
    } catch (err) {
      notifications.show({
        title: "Rename error",
        message: String(err),
        color: "red",
      });
    }
  };

  const deleteCategory = async (categoryName: string, deleteMods: boolean) => {
    if (!modsDir) return;
    try {
      await invoke("delete_category", {
        modsDir,
        categoryName,
        deleteMods,
        gameId: activeGameId,
      });
      await refreshData();
      notifications.show({
        title: "Category deleted",
        message: `Category "${categoryName}" deleted.`,
        color: "orange",
      });
    } catch (err) {
      notifications.show({
        title: "Delete category failed",
        message: String(err),
        color: "red",
      });
    }
  };

  const setModPreview = async (mod: ModItem) => {
    if (!modsDir) return;
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "Images",
            extensions: ["png", "jpg", "jpeg", "webp"],
          },
        ],
      });
      if (selected && typeof selected === "string") {
        const fileUrl = convertFileSrc(selected);
        const img = new window.Image();
        img.src = fileUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const targetWidth = 600;
        const targetHeight = 338;
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Failed to get canvas context");
        }

        const hRatio = canvas.width / img.width;
        const vRatio = canvas.height / img.height;
        const ratio = Math.max(hRatio, vRatio);
        const centerShiftX = (canvas.width - img.width * ratio) / 2;
        const centerShiftY = (canvas.height - img.height * ratio) / 2;
        ctx.drawImage(
          img,
          0,
          0,
          img.width,
          img.height,
          centerShiftX,
          centerShiftY,
          img.width * ratio,
          img.height * ratio,
        );

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png"),
        );
        if (!blob) {
          throw new Error("Failed to encode image to PNG");
        }
        const arrayBuffer = await blob.arrayBuffer();
        const imageBytes = Array.from(new Uint8Array(arrayBuffer));

        await invoke("set_mod_preview_image", {
          modsDir,
          modId: mod.id,
          imageBytes,
          gameId: activeGameId,
        });

        await refreshData();
        notifications.show({
          title: "Preview updated",
          message: `Preview image updated for ${mod.name}.`,
          color: "green",
        });
      }
    } catch (err) {
      notifications.show({
        title: "Preview error",
        message: String(err),
        color: "red",
      });
    }
  };

  const openFolder = async (folderPath: string) => {
    try {
      await openPath(folderPath);
    } catch (err) {
      notifications.show({
        title: "Error",
        message: String(err),
        color: "red",
      });
    }
  };

  return {
    toggleMods,
    toggleMod,
    moveMods,
    moveMod,
    deleteMods,
    deleteMod,
    createCategory,
    renameCategory,
    deleteCategory,
    setModPreview,
    openFolder,
  };
}

export type ModOperations = ReturnType<typeof useModOperations>;
