import {
  Box,
  Center,
  LoadingOverlay,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { FolderX } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import {
  fetchByCategory,
  fetchGameCategoryTree,
  fetchSubfeed,
  GbCategoryGroup,
  GbModFile,
  GbSubfeedItem,
  isGbModNsfw,
  searchGameBananaMods,
} from "../../api/gamebanana";
import { DownloadQueueItem, GameDefinition } from "../../types";
import { staggerItem } from "../../motion";
import GbBrowserPagination from "./GbBrowserPagination";
import GbBrowserToolbar from "./GbBrowserToolbar";
import GbModCard from "./GbModCard";
import GbModDrawer from "./GbModDrawer";

interface GbBrowserViewProps {
  activeGame: GameDefinition;
  modsDir?: string;
  autoCategorize: boolean;
  showNsfw: boolean;
  downloadQueue: DownloadQueueItem[];
  onEnqueueDownload: (
    file: GbModFile,
    modName: string,
    gamebananaId: number,
    version?: string,
    categoryName?: string,
    previewUrl?: string,
  ) => void;
}

export default function GbBrowserView({
  activeGame,
  modsDir,
  autoCategorize,
  showNsfw,
  downloadQueue,
  onEnqueueDownload,
}: GbBrowserViewProps) {
  const [categoryGroups, setCategoryGroups] = useState<GbCategoryGroup[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<string>("default");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeSearch, setActiveSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<GbSubfeedItem[]>([]);
  const [isLastPage, setIsLastPage] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedModId, setSelectedModId] = useState<number | null>(null);

  useEffect(() => {
    async function loadCategories() {
      try {
        const groups = await fetchGameCategoryTree(
          activeGame.gamebanana_game_id,
        );
        setCategoryGroups(groups);
      } catch (err) {
        notifications.show({
          title: "Categories Error",
          message: String(err),
          color: "red",
        });
      }
    }
    loadCategories();
    setSelectedCategory(null);
    setSearchQuery("");
    setActiveSearch("");
    setPage(1);
  }, [activeGame]);

  const loadMods = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeSearch.trim()) {
        const res = await searchGameBananaMods(
          activeGame.gamebanana_game_id,
          activeSearch.trim(),
          page,
        );
        setItems(res.records);
        setIsLastPage(res.isLastPage);
      } else if (selectedCategory) {
        const catId = parseInt(selectedCategory, 10);
        const res = await fetchByCategory(catId, page, sortOption);
        setItems(res.records);
        setIsLastPage(res.isLastPage);
      } else {
        const res = await fetchSubfeed(
          activeGame.gamebanana_game_id,
          page,
          sortOption,
        );
        setItems(res.records);
        setIsLastPage(res.isLastPage);
      }
    } catch (err) {
      notifications.show({
        title: "Browser Error",
        message: String(err),
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeGame, activeSearch, selectedCategory, sortOption, page]);

  useEffect(() => {
    loadMods();
  }, [loadMods]);

  const handleSearchSubmit = () => {
    setActiveSearch(searchQuery);
    setSelectedCategory(null);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setActiveSearch("");
    setPage(1);
  };

  const handleCategoryChange = (value: string | null) => {
    setSelectedCategory(value);
    setActiveSearch("");
    setSearchQuery("");
    setPage(1);
  };

  const handleSortChange = (value: string) => {
    setSortOption(value);
    setPage(1);
  };

  const handleInstallFile = (
    file: GbModFile,
    modName: string,
    gamebananaId: number,
    version?: string,
    categoryName?: string,
    previewUrl?: string,
  ) => {
    if (!modsDir) {
      notifications.show({
        title: "No Mods Directory",
        message:
          "Please configure your mods directory in Settings before downloading mods.",
        color: "orange",
      });
      return;
    }

    const resolvedCategory = autoCategorize ? categoryName : undefined;
    onEnqueueDownload(
      file,
      modName,
      gamebananaId,
      version,
      resolvedCategory,
      previewUrl,
    );
  };

  const categorySelectData = [
    { value: "", label: "All Categories" },
    ...categoryGroups,
  ];

  const sortSelectData = [
    { value: "default", label: "Default Sort" },
    { value: "Generic_Newest", label: "Newest" },
    { value: "Generic_LatestUpdated", label: "Recently Updated" },
    { value: "Generic_MostLiked", label: "Most Liked" },
    { value: "Generic_MostViewed", label: "Most Viewed" },
    { value: "Generic_MostDownloaded", label: "Most Downloaded" },
  ];

  return (
    <Box
      p="sm"
      style={{
        position: "relative",
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <GbBrowserToolbar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        onClearSearch={handleClearSearch}
        categorySelectData={categorySelectData}
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
        sortSelectData={sortSelectData}
        sortOption={sortOption}
        onSortChange={handleSortChange}
      />

      <Box style={{ flex: 1, position: "relative" }}>
        <LoadingOverlay visible={isLoading} />

        {items.length === 0 && !isLoading ? (
          <Center h="var(--height-empty-state)">
            <Stack align="center" gap="sm" className="animate-fade-in-up">
              <FolderX size={44} color="var(--color-text-muted)" />
              <Text fw={600} size="md">
                No Mods Found
              </Text>
              <Text c="dimmed" size="xs" ta="center">
                Try a different search query or select another category.
              </Text>
            </Stack>
          </Center>
        ) : (
          <SimpleGrid
            cols={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5, xxl: 6 }}
            spacing="sm"
          >
            {items
              .filter((item) => showNsfw || !isGbModNsfw(item))
              .map((item, index) => (
                <motion.div
                  key={item._idRow}
                  variants={staggerItem()}
                  initial="hidden"
                  animate="visible"
                  custom={index}
                  style={{ height: "100%" }}
                >
                  <GbModCard item={item} onSelect={setSelectedModId} />
                </motion.div>
              ))}
          </SimpleGrid>
        )}
      </Box>

      <GbBrowserPagination
        page={page}
        isLastPage={isLastPage}
        isLoading={isLoading}
        onPrevious={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => p + 1)}
      />

      <GbModDrawer
        modId={selectedModId}
        opened={selectedModId !== null}
        onClose={() => setSelectedModId(null)}
        onInstall={handleInstallFile}
        downloadQueue={downloadQueue}
      />
    </Box>
  );
}
