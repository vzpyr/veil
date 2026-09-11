import {
  ActionIcon,
  Box,
  Button,
  Center,
  Group,
  LoadingOverlay,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { ArrowLeft, ArrowRight, FolderX, Search, X } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import {
  fetchByCategory,
  fetchGameCategoryTree,
  fetchSubfeed,
  GbCategoryGroup,
  GbModFile,
  GbSubfeedItem,
  searchGameBananaMods,
} from "../../api/gamebanana";
import { DownloadQueueItem, GameDefinition } from "../../types";
import { isGbModNsfw } from "../../api/gamebanana";
import { staggerItem } from "../../motion";
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
    { value: "new", label: "Newest" },
    { value: "updated", label: "Recently Updated" },
    { value: "views", label: "Most Viewed" },
    { value: "likes", label: "Most Liked" },
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
      <Group justify="space-between" mb="sm" wrap="wrap" gap="xs">
        <TextInput
          size="xs"
          placeholder="Search mods..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearchSubmit();
            }
          }}
          leftSection={<Search size={14} />}
          rightSection={
            searchQuery ? (
              <Tooltip label="Clear search">
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  onClick={handleClearSearch}
                >
                  <X size={12} />
                </ActionIcon>
              </Tooltip>
            ) : null
          }
          style={{ flex: 1, minWidth: "var(--min-width-search)" }}
        />

        <Group gap="xs">
          <Select
            size="xs"
            w="var(--control-width-lg)"
            data={categorySelectData}
            value={selectedCategory || ""}
            onChange={(val) => {
              setSelectedCategory(val || null);
              setActiveSearch("");
              setSearchQuery("");
              setPage(1);
            }}
            searchable
            clearable
            allowDeselect={true}
          />

          <Select
            size="xs"
            w="var(--control-width-sm)"
            data={sortSelectData}
            value={sortOption}
            onChange={(val) => {
              if (val) {
                setSortOption(val);
                setPage(1);
              }
            }}
            allowDeselect={false}
          />

          <Button size="xs" variant="default" onClick={handleSearchSubmit}>
            Search
          </Button>
        </Group>
      </Group>

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

      <Group justify="center" gap="sm" mt="md" py="xs">
        <Button
          size="xs"
          variant="default"
          leftSection={<ArrowLeft size={14} />}
          disabled={page <= 1 || isLoading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </Button>
        <Text size="xs" fw={600} c="dimmed">
          Page {page}
        </Text>
        <Button
          size="xs"
          variant="default"
          rightSection={<ArrowRight size={14} />}
          disabled={isLastPage || isLoading}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </Group>

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
