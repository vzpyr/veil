import { Button, Group, Text } from "@mantine/core";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface GbBrowserPaginationProps {
  page: number;
  isLastPage: boolean;
  isLoading: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export default function GbBrowserPagination({
  page,
  isLastPage,
  isLoading,
  onPrevious,
  onNext,
}: GbBrowserPaginationProps) {
  return (
    <Group justify="center" gap="sm" mt="md" py="xs">
      <Button
        size="xs"
        variant="default"
        leftSection={<ArrowLeft size={14} />}
        disabled={page <= 1 || isLoading}
        onClick={onPrevious}
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
        onClick={onNext}
      >
        Next
      </Button>
    </Group>
  );
}
