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
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconArrowLeft,
  IconArrowRight,
  IconFolderOff,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import {
  fetchByCategory,
  fetchCategories,
  fetchSubfeed,
  GbCategory,
  GbModFile,
  GbSubfeedItem,
  searchGameBananaMods,
} from "../../api/gamebanana";
import { DownloadProgressPayload, GameDefinition } from "../../types";
import GbModCard from "./GbModCard";
import GbModModal from "./GbModModal";

interface GbBrowserViewProps {
  activeGame: GameDefinition;
  modsDir?: string;
  autoCategorize: boolean;
  activeDownloads: Record<string, DownloadProgressPayload>;
  onInstallSuccess: () => void;
}

export default function GbBrowserView({
  activeGame,
  modsDir,
  autoCategorize,
  activeDownloads,
  onInstallSuccess,
}: GbBrowserViewProps) {
  const [categories, setCategories] = useState<GbCategory[]>([]);
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
      if (!activeGame.root_category_id) {
        setCategories([]);
        return;
      }
      try {
        const cats = await fetchCategories(activeGame.root_category_id);
        setCategories(cats);
      } catch (err) {
        console.error(err);
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

  const handleInstallFile = async (
    file: GbModFile,
    modName: string,
    categoryName?: string,
    previewUrl?: string,
  ) => {
    if (!modsDir) {
      notifications.show({
        title: "Configuration Required",
        message:
          "Please configure your game mods directory in Settings before downloading mods.",
        color: "orange",
      });
      return;
    }

    const key = String(file._idRow);
    const resolvedCategory = autoCategorize ? categoryName : undefined;

    try {
      notifications.show({
        title: "Download Started",
        message: `Downloading ${file._sFile}...`,
        color: "blue",
      });

      await invoke("download_mod", {
        downloadUrl: file._sDownloadUrl,
        modsDir,
        modName,
        category: resolvedCategory,
        previewUrl,
        key,
      });

      notifications.show({
        title: "Installation Complete",
        message: `${modName} installed successfully into DISABLED_veil.`,
        color: "green",
      });

      onInstallSuccess();
    } catch (err) {
      notifications.show({
        title: "Installation Failed",
        message: String(err),
        color: "red",
      });
    }
  };

  const categorySelectData = [
    { value: "", label: "All Categories" },
    ...categories.map((c) => ({
      value: String(c._idRow),
      label: `${c._sName} (${c._nItemCount})`,
    })),
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
      p="md"
      style={{
        position: "relative",
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Group justify="space-between" mb="md" wrap="wrap" gap="sm">
        <Group gap="sm" style={{ flex: 1, minWidth: 300 }}>
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
            leftSection={<IconSearch size={14} />}
            rightSection={
              searchQuery ? (
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  onClick={handleClearSearch}
                >
                  <IconX size={12} />
                </ActionIcon>
              ) : null
            }
            style={{ flex: 1 }}
          />
          <Button size="xs" variant="light" onClick={handleSearchSubmit}>
            Search
          </Button>
        </Group>

        <Group gap="xs">
          <Select
            size="xs"
            w={200}
            data={categorySelectData}
            value={selectedCategory || ""}
            onChange={(val) => {
              setSelectedCategory(val || null);
              setActiveSearch("");
              setSearchQuery("");
              setPage(1);
            }}
            allowDeselect={false}
          />

          <Select
            size="xs"
            w={160}
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
        </Group>
      </Group>

      <Box style={{ flex: 1, position: "relative" }}>
        <LoadingOverlay visible={isLoading} />

        {items.length === 0 && !isLoading ? (
          <Center h={300}>
            <Stack align="center" gap="sm">
              <IconFolderOff size={48} color="var(--color-text-muted)" />
              <Text fw={600} size="lg">
                No Mods Found
              </Text>
              <Text c="dimmed" size="sm">
                Try a different search query or select another category.
              </Text>
            </Stack>
          </Center>
        ) : (
          <SimpleGrid
            cols={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }}
            spacing="md"
          >
            {items.map((item) => (
              <GbModCard
                key={item._idRow}
                item={item}
                onSelect={setSelectedModId}
              />
            ))}
          </SimpleGrid>
        )}
      </Box>

      <Group justify="center" gap="md" mt="xl" py="sm">
        <Button
          size="xs"
          variant="default"
          leftSection={<IconArrowLeft size={14} />}
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
          rightSection={<IconArrowRight size={14} />}
          disabled={isLastPage || isLoading}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </Group>

      <GbModModal
        modId={selectedModId}
        opened={selectedModId !== null}
        onClose={() => setSelectedModId(null)}
        onInstall={handleInstallFile}
        activeDownloads={activeDownloads}
      />
    </Box>
  );
}
