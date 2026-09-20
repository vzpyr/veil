import { Box, Text } from "@mantine/core";

export default function GbModDescriptionTab({ text }: { text?: string }) {
  return (
    <Box p="xs">
      {text ? (
        <div
          className="gb-rich-text"
          dangerouslySetInnerHTML={{ __html: text }}
        />
      ) : (
        <Text size="sm" c="dimmed" ta="center" py="md">
          No description provided by author
        </Text>
      )}
    </Box>
  );
}
