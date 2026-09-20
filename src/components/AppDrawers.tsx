import CategoryDrawer from "./CategoryDrawer";
import ConflictDrawer from "./ConflictDrawer";
import { DownloadQueueDrawer } from "./DownloadQueueDrawer";
import { DuplicateDrawer } from "./DuplicateDrawer";
import KeybindDrawer from "./KeybindDrawer";
import LinkGameBananaDrawer from "./LinkGameBananaDrawer";
import ManualInstallDrawer from "./ManualInstallDrawer";
import GbModDrawer from "./browser/GbModDrawer";
import type { AppConfigApi } from "../hooks/useAppConfig";
import type { ModsLibrary } from "../hooks/useModsLibrary";
import type { ModOperations } from "../hooks/useModOperations";
import type { AppUi } from "../hooks/useAppUi";
import type { Downloads } from "../hooks/useDownloads";
import type { ManualInstall } from "../hooks/useManualInstall";

interface AppDrawersProps {
  config: AppConfigApi;
  mods: ModsLibrary;
  ops: ModOperations;
  ui: AppUi;
  downloads: Downloads;
  manual: ManualInstall;
}

export default function AppDrawers({
  config,
  mods,
  ops,
  ui,
  downloads,
  manual,
}: AppDrawersProps) {
  return (
    <>
      <ConflictDrawer
        opened={ui.conflictDrawerOpen}
        onClose={() => ui.setConflictDrawerOpen(false)}
        conflicts={mods.conflicts}
        allMods={mods.mods}
        onToggleMod={ops.toggleMod}
      />

      <DownloadQueueDrawer
        opened={ui.queueDrawerOpen}
        onClose={() => ui.setQueueDrawerOpen(false)}
        queue={downloads.downloadQueue}
        onClearCompleted={downloads.clearCompleted}
        onCancelItem={downloads.cancelItem}
        onRetryItem={downloads.retryItem}
      />

      <KeybindDrawer
        opened={Boolean(ui.keybindDrawerMod)}
        onClose={() => ui.setKeybindDrawerMod(null)}
        mod={ui.keybindDrawerMod}
        modsDir={config.modsDir}
      />

      {downloads.duplicateModalState && (
        <DuplicateDrawer
          opened={downloads.duplicateModalState.opened}
          onClose={downloads.closeDuplicate}
          modName={downloads.duplicateModalState.modName}
          existingMod={downloads.duplicateModalState.existingMod}
          onConfirm={downloads.confirmDuplicate}
        />
      )}

      <CategoryDrawer
        opened={ui.categoryModal.open}
        onClose={() =>
          ui.setCategoryModal({
            open: false,
            mode: "create",
            modsToMove: [],
            categoryName: null,
            onSuccess: undefined,
          })
        }
        mode={ui.categoryModal.mode}
        categories={mods.categories}
        modsToMove={ui.categoryModal.modsToMove}
        categoryName={ui.categoryModal.categoryName}
        onMoveMods={(modIds, targetCategory) =>
          ops.moveMods(modIds, targetCategory, ui.categoryModal.onSuccess)
        }
        onCreateCategory={ops.createCategory}
        onRenameCategory={async (oldName, newName) => {
          await ops.renameCategory(oldName, newName);
          if (ui.selectedCategory === oldName) {
            ui.setSelectedCategory(newName);
          }
        }}
        onDeleteCategory={async (categoryName, deleteMods) => {
          await ops.deleteCategory(categoryName, deleteMods);
          if (ui.selectedCategory === categoryName) {
            ui.setSelectedCategory(null);
          }
        }}
      />

      <ManualInstallDrawer
        opened={manual.modalOpen}
        onClose={() => manual.setModalOpen(false)}
        archivePaths={manual.archivePaths}
        categories={mods.categories}
        onInstall={manual.confirm}
        isInstalling={manual.isInstalling}
      />

      {ui.selectedGbModId && (
        <GbModDrawer
          modId={ui.selectedGbModId}
          opened={Boolean(ui.selectedGbModId)}
          onClose={() => ui.setSelectedGbModId(null)}
          onInstall={downloads.enqueueDownload}
          downloadQueue={downloads.downloadQueue}
        />
      )}

      <LinkGameBananaDrawer
        opened={Boolean(ui.linkingMod)}
        onClose={() => ui.setLinkingMod(null)}
        mod={ui.linkingMod}
        modsDir={config.modsDir}
        gameId={config.activeGame?.id}
        onSuccess={() => mods.refreshData()}
      />
    </>
  );
}
