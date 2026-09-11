import {
  Avatar,
  Badge,
  Card,
  Group,
  Image,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { Eye, Heart, ImageIcon, TriangleAlert } from "lucide-react";
import { GbSubfeedItem, isGbModNsfw } from "../../api/gamebanana";

interface GbModCardProps {
  item: GbSubfeedItem;
  onSelect: (modId: number) => void;
}

export default function GbModCard({ item, onSelect }: GbModCardProps) {
  const firstImage = item._aPreviewMedia?._aImages?.[0];
  const imageUrl = firstImage
    ? `${firstImage._sBaseUrl}/${firstImage._sFile530 || firstImage._sFile220 || firstImage._sFile}`
    : null;
  const nsfw = isGbModNsfw(item);

  return (
    <Card
      p="xs"
      h="100%"
      className="card-interactive"
      onClick={() => onSelect(item._idRow)}
    >
      <Card.Section
        className="card-media"
        style={{
          position: "relative",
          aspectRatio: "16 / 9",
          backgroundColor: "var(--color-bg-surface-2)",
          borderTopLeftRadius: "var(--radius-lg)",
          borderTopRightRadius: "var(--radius-lg)",
          overflow: "hidden",
        }}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            h="100%"
            w="100%"
            fit="cover"
            alt={item._sName}
          />
        ) : (
          <Stack h="100%" align="center" justify="center" gap="xs">
            <ImageIcon size={32} color="var(--color-text-muted)" />
            <Text size="2xs" c="dimmed">
              No preview image
            </Text>
          </Stack>
        )}

        <Group
          style={{
            position: "absolute",
            top: "var(--space-sm)",
            left: "var(--space-sm)",
            right: "var(--space-sm)",
            justifyContent: "space-between",
          }}
        >
          <Group gap="2xs">
            {item._aCategory && (
              <Badge size="xs" variant="filled" color="dark">
                {item._aCategory._sName}
              </Badge>
            )}
            {nsfw && (
              <Tooltip label="Contains adult content">
                <Badge
                  size="xs"
                  variant="filled"
                  color="red"
                  className="animate-scale-in"
                  leftSection={<TriangleAlert size={10} />}
                >
                  NSFW
                </Badge>
              </Tooltip>
            )}
          </Group>
        </Group>
      </Card.Section>

      <Stack gap="xs" mt="xs">
        <Tooltip label={item._sName}>
          <Text fw={600} size="sm" truncate>
            {item._sName}
          </Text>
        </Tooltip>

        <Group justify="space-between" align="center">
          <Group gap="xs">
            <Avatar src={item._aSubmitter?._sAvatarUrl} size="xs" />
            <Text size="xs" c="dimmed" truncate maw="var(--max-width-author)">
              {item._aSubmitter?._sName || "Unknown Author"}
            </Text>
          </Group>

          <Group gap="xs">
            {typeof item._nLikeCount === "number" && (
              <Group gap="2xs">
                <Heart size={12} color="var(--color-text-muted)" />
                <Text size="xs" c="dimmed">
                  {item._nLikeCount}
                </Text>
              </Group>
            )}

            {typeof item._nViewCount === "number" && (
              <Group gap="2xs">
                <Eye size={12} color="var(--color-text-muted)" />
                <Text size="xs" c="dimmed">
                  {item._nViewCount}
                </Text>
              </Group>
            )}
          </Group>
        </Group>
      </Stack>
    </Card>
  );
}
