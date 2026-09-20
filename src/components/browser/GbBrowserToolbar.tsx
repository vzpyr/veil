import {
  ActionIcon,
  Button,
  Group,
  Select,
  TextInput,
  Tooltip,
} from "@mantine/core";
import type { SelectProps } from "@mantine/core";
import { Search, X } from "lucide-react";

interface GbBrowserToolbarProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchSubmit: () => void;
  onClearSearch: () => void;
  categorySelectData: SelectProps["data"];
  selectedCategory: string | null;
  onCategoryChange: (value: string | null) => void;
  sortSelectData: SelectProps["data"];
  sortOption: string;
  onSortChange: (value: string) => void;
}

export default function GbBrowserToolbar({
  searchQuery,
  onSearchQueryChange,
  onSearchSubmit,
  onClearSearch,
  categorySelectData,
  selectedCategory,
  onCategoryChange,
  sortSelectData,
  sortOption,
  onSortChange,
}: GbBrowserToolbarProps) {
  return (
    <Group justify="space-between" mb="sm" wrap="wrap" gap="xs">
      <TextInput
        size="xs"
        placeholder="Search mods..."
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSearchSubmit();
          }
        }}
        leftSection={<Search size={14} />}
        rightSection={
          searchQuery ? (
            <Tooltip label="Clear search">
              <ActionIcon size="xs" variant="subtle" onClick={onClearSearch}>
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
          onChange={(val) => onCategoryChange(val || null)}
          allowDeselect={false}
        />

        <Select
          size="xs"
          w="var(--control-width-sm)"
          data={sortSelectData}
          value={sortOption}
          onChange={(val) => val && onSortChange(val)}
          allowDeselect={false}
        />

        <Button size="xs" variant="default" onClick={onSearchSubmit}>
          Search
        </Button>
      </Group>
    </Group>
  );
}
