import { Box } from "@mantine/core";
import Sidebar from "./Sidebar";
import ModGrid from "./ModGrid";
import type { AppConfigApi } from "../hooks/useAppConfig";
import type { ModsLibrary } from "../hooks/useModsLibrary";
import type { ModOperations } from "../hooks/useModOperations";
import type { AppUi } from "../hooks/useAppUi";
import type { ModFilters } from "../hooks/useModFilters";
import type { ManualInstall } from "../hooks/useManualInstall";

interface InstalledViewProps {
  config: AppConfigApi;
  mods: ModsLibrary;
  ops: ModOperations;
  ui: AppUi;
  filters: ModFilters;
  manual: ManualInstall;
}

export default function InstalledView({
  config,
  mods,
  ops,
  ui,
  filters,
  manual,
}: InstalledViewProps) {
  return (
    <>
      <Sidebar
        categories={mods.categories}
        selectedCategory={ui.selectedCategory}
        onSelectCategory={ui.setSelectedCategory}
        totalModsCount={mods.mods.length}
        uncategorizedCount={filters.uncategorizedCount}
        searchQuery={ui.searchQuery}
        onSearchChange={ui.setSearchQuery}
        conflicts={mods.conflicts}
        onOpenConflicts={() => ui.setConflictDrawerOpen(true)}
        onOpenCreateCategory={() =>
          ui.setCategoryModal({
            open: true,
            mode: "create",
            modsToMove: [],
            categoryName: null,
          })
        }
        onRenameCategory={(catName) =>
          ui.setCategoryModal({
            open: true,
            mode: "rename",
            modsToMove: [],
            categoryName: catName,
          })
        }
        onDeleteCategory={(catName) =>
          ui.setCategoryModal({
            open: true,
            mode: "delete",
            modsToMove: [],
            categoryName: catName,
          })
        }
        onOpenManualInstall={manual.openPicker}
        onOpenModsFolder={() => {
          if (config.modsDir) {
            ops.openFolder(config.modsDir);
          }
        }}
        onCheckUpdates={mods.checkUpdates}
        isCheckingUpdates={mods.isCheckingUpdates}
        onRescanMods={mods.rescanMods}
        isRefreshing={mods.isRefreshing}
        hasModsDir={Boolean(config.modsDir)}
      />

      <Box
        style={{
          flex: 1,
          overflowY: "auto",
          backgroundColor: "var(--color-bg-base)",
        }}
      >
        <ModGrid
          mods={filters.displayedMods}
          hasModsDir={Boolean(config.modsDir)}
          conflicts={mods.conflicts}
          updatesMap={mods.updatesMap}
          statusFilter={ui.statusFilter}
          onStatusFilterChange={ui.setStatusFilter}
          sortBy={ui.sortBy}
          onSortByChange={ui.setSortBy}
          viewMode={config.config?.view_mode || "grid"}
          onViewModeChange={config.setViewMode}
          totalCount={filters.totalInScope}
          enabledCount={filters.enabledInScope}
          disabledCount={filters.disabledInScope}
          onToggle={ops.toggleMod}
          onMoveCategory={(mod) =>
            ui.setCategoryModal({
              open: true,
              mode: "move",
              modsToMove: [mod],
              categoryName: null,
            })
          }
          onOpenFolder={ops.openFolder}
          onDelete={ops.deleteMod}
          onOpenConflicts={() => ui.setConflictDrawerOpen(true)}
          onOpenSettings={() => ui.setActiveTab("settings")}
          onOpenKeybinds={ui.setKeybindDrawerMod}
          onOpenGameBanana={(mod) => {
            if (mod.gamebanana_id) {
              ui.setSelectedGbModId(mod.gamebanana_id);
            }
          }}
          onOpenLinkGameBanana={ui.setLinkingMod}
          onSetPreview={ops.setModPreview}
          onBatchToggle={ops.toggleMods}
          onBatchMoveCategory={(modsToMove, onDone) =>
            ui.setCategoryModal({
              open: true,
              mode: "move",
              modsToMove,
              categoryName: null,
              onSuccess: onDone,
            })
          }
          onBatchDelete={ops.deleteMods}
          activeGameId={config.activeGame?.id}
        />
      </Box>
    </>
  );
}
