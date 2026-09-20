import { useState } from "react";
import { ModItem } from "../types";

export interface CategoryModalState {
  open: boolean;
  mode: "create" | "move" | "rename" | "delete";
  modsToMove?: ModItem[];
  categoryName?: string | null;
  onSuccess?: () => void;
}

export default function useAppUi() {
  const [activeTab, setActiveTab] = useState("installed");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [conflictDrawerOpen, setConflictDrawerOpen] = useState(false);
  const [queueDrawerOpen, setQueueDrawerOpen] = useState(false);
  const [keybindDrawerMod, setKeybindDrawerMod] = useState<ModItem | null>(
    null,
  );
  const [linkingMod, setLinkingMod] = useState<ModItem | null>(null);
  const [selectedGbModId, setSelectedGbModId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "enabled" | "disabled"
  >("all");
  const [sortBy, setSortBy] = useState("name-asc");
  const [categoryModal, setCategoryModal] = useState<CategoryModalState>({
    open: false,
    mode: "create",
    modsToMove: [],
    categoryName: null,
  });

  return {
    activeTab,
    setActiveTab,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    isLoading,
    setIsLoading,
    conflictDrawerOpen,
    setConflictDrawerOpen,
    queueDrawerOpen,
    setQueueDrawerOpen,
    keybindDrawerMod,
    setKeybindDrawerMod,
    linkingMod,
    setLinkingMod,
    selectedGbModId,
    setSelectedGbModId,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    categoryModal,
    setCategoryModal,
  };
}

export type AppUi = ReturnType<typeof useAppUi>;
