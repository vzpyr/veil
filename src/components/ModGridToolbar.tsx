import { Button, Center, Group, SegmentedControl, Select } from "@mantine/core";
import { CheckSquare, LayoutGrid, List } from "lucide-react";
import type { ReactNode } from "react";

interface ModGridToolbarProps {
  statusFilter: "all" | "enabled" | "disabled";
  onStatusFilterChange: (filter: "all" | "enabled" | "disabled") => void;
  totalCount: number;
  enabledCount: number;
  disabledCount: number;
  sortBy: string;
  onSortByChange: (sort: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  isSelectMode: boolean;
  onToggleSelectMode: () => void;
}

function FilterLabel({ children }: { children: ReactNode }) {
  return (
    <Center
      h="var(--control-inner-height-xs)"
      style={{ padding: "0 var(--space-xs)", whiteSpace: "nowrap" }}
    >
      {children}
    </Center>
  );
}

function ViewModeLabel({ children }: { children: ReactNode }) {
  return (
    <Center
      h="var(--control-inner-height-xs)"
      style={{ padding: "0 var(--space-3xs)" }}
    >
      {children}
    </Center>
  );
}

export default function ModGridToolbar({
  statusFilter,
  onStatusFilterChange,
  totalCount,
  enabledCount,
  disabledCount,
  sortBy,
  onSortByChange,
  viewMode,
  onViewModeChange,
  isSelectMode,
  onToggleSelectMode,
}: ModGridToolbarProps) {
  return (
    <Group justify="space-between" mb="sm" wrap="wrap" gap="xs">
      <Group gap="xs">
        <SegmentedControl
          size="xs"
          value={statusFilter}
          onChange={(val) =>
            onStatusFilterChange(val as "all" | "enabled" | "disabled")
          }
          data={[
            {
              value: "all",
              label: <FilterLabel>All ({totalCount})</FilterLabel>,
            },
            {
              value: "enabled",
              label: <FilterLabel>Enabled ({enabledCount})</FilterLabel>,
            },
            {
              value: "disabled",
              label: <FilterLabel>Disabled ({disabledCount})</FilterLabel>,
            },
          ]}
        />
        <Select
          size="xs"
          w="var(--control-width-sm)"
          value={sortBy}
          onChange={(val) => onSortByChange(val || "name-asc")}
          allowDeselect={false}
          data={[
            { value: "name-asc", label: "Name (A to Z)" },
            { value: "name-desc", label: "Name (Z to A)" },
            { value: "last-updated", label: "Last updated" },
          ]}
        />
      </Group>
      <Group gap="xs">
        <SegmentedControl
          size="xs"
          value={viewMode}
          onChange={(val) => onViewModeChange(val as "grid" | "list")}
          data={[
            {
              value: "grid",
              label: (
                <ViewModeLabel>
                  <LayoutGrid size={14} />
                </ViewModeLabel>
              ),
            },
            {
              value: "list",
              label: (
                <ViewModeLabel>
                  <List size={14} />
                </ViewModeLabel>
              ),
            },
          ]}
        />
        <Button
          size="xs"
          variant={isSelectMode ? "filled" : "default"}
          leftSection={<CheckSquare size={14} />}
          onClick={onToggleSelectMode}
          h="var(--control-height-xs)"
        >
          {isSelectMode ? "Done" : "Select"}
        </Button>
      </Group>
    </Group>
  );
}
