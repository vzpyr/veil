import { useMemo } from "react";
import { ModItem } from "../types";

interface UseModFiltersArgs {
  mods: ModItem[];
  selectedCategory: string | null;
  searchQuery: string;
  statusFilter: "all" | "enabled" | "disabled";
  sortBy: string;
}

export default function useModFilters({
  mods,
  selectedCategory,
  searchQuery,
  statusFilter,
  sortBy,
}: UseModFiltersArgs) {
  const categoryAndSearchMods = useMemo(() => {
    return mods.filter((mod) => {
      const matchesCategory =
        selectedCategory === null ||
        (selectedCategory === "__root__" || selectedCategory === "uncategorized"
          ? !mod.category
          : mod.category === selectedCategory);

      const matchesSearch =
        !searchQuery.trim() ||
        mod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mod.id.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [mods, selectedCategory, searchQuery]);

  const displayedMods = useMemo(() => {
    const list = categoryAndSearchMods.filter((mod) => {
      if (statusFilter === "enabled") return mod.enabled;
      if (statusFilter === "disabled") return !mod.enabled;
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "name-asc") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "name-desc") {
        return b.name.localeCompare(a.name);
      }
      if (sortBy === "last-updated") {
        return (b.updated_at ?? 0) - (a.updated_at ?? 0);
      }
      return 0;
    });
  }, [categoryAndSearchMods, statusFilter, sortBy]);

  const totalInScope = categoryAndSearchMods.length;
  const enabledInScope = categoryAndSearchMods.filter((m) => m.enabled).length;
  const disabledInScope = totalInScope - enabledInScope;
  const uncategorizedCount = mods.filter((m) => !m.category).length;

  return {
    categoryAndSearchMods,
    displayedMods,
    totalInScope,
    enabledInScope,
    disabledInScope,
    uncategorizedCount,
  };
}

export type ModFilters = ReturnType<typeof useModFilters>;
