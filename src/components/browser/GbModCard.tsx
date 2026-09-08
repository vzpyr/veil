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
import { IconEye, IconHeart, IconPhoto } from "@tabler/icons-react";
import { GbSubfeedItem } from "../../api/gamebanana";

interface GbModCardProps {
  item: GbSubfeedItem;
  onSelect: (modId: number) => void;
}

export default function GbModCard({ item, onSelect }: GbModCardProps) {
  const firstImage = item._aPreviewMedia?._aImages?.[0];
  const imageUrl = firstImage
    ? `${firstImage._sBaseUrl}/${firstImage._sFile530 || firstImage._sFile220 || firstImage._sFile}`
    : null;

  return (
    <Card
      p="xs"
      radius="lg"
      withBorder
      className="card-interactive"
      onClick={() => onSelect(item._idRow)}
    >
      <Card.Section
        style={{
          position: "relative",
          aspectRatio: "16 / 9",
          backgroundColor: "var(--color-bg-surface-2)",
          borderTopLeftRadius: "var(--radius-md)",
          borderTopRightRadius: "var(--radius-md)",
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
            <IconPhoto size={32} color="var(--color-text-muted)" />
            <Text size="2xs" c="dimmed">
              No preview image
            </Text>
          </Stack>
        )}

        {item._aCategory && (
          <Badge
            size="xs"
            radius="xl"
            variant="filled"
            color="dark"
            style={{
              position: "absolute",
              top: "var(--space-xs)",
              left: "var(--space-xs)",
            }}
          >
            {item._aCategory._sName}
          </Badge>
        )}
      </Card.Section>

      <Stack gap="xs" mt="xs">
        <Tooltip label={item._sName}>
          <Text fw={600} size="sm" truncate>
            {item._sName}
          </Text>
        </Tooltip>

        <Group justify="space-between" align="center">
          <Group gap="xs">
            <Avatar src={item._aSubmitter?._sAvatarUrl} size="xs" radius="xl" />
            <Text size="xs" c="dimmed" truncate maw="var(--max-width-author)">
              {item._aSubmitter?._sName || "Unknown"}
            </Text>
          </Group>

          <Group gap="xs">
            {typeof item._nLikeCount === "number" && (
              <Group gap="2xs">
                <IconHeart size={12} color="var(--color-text-muted)" />
                <Text size="xs" c="dimmed">
                  {item._nLikeCount}
                </Text>
              </Group>
            )}

            {typeof item._nViewCount === "number" && (
              <Group gap="2xs">
                <IconEye size={12} color="var(--color-text-muted)" />
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
