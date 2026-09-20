import { Badge, Group, Text } from "@mantine/core";
import { Download, Eye, Globe, Heart } from "lucide-react";
import type { ReactNode } from "react";
import { GbModProfile } from "../../api/gamebanana";
import { formatVersion } from "../../utils";

function StatBadge({ icon, value }: { icon: ReactNode; value: number }) {
  return (
    <Badge size="xs" variant="light" color="gray">
      <Group gap="3xs" wrap="nowrap">
        {icon}
        <Text size="2xs">{value}</Text>
      </Group>
    </Badge>
  );
}

export default function GbModDrawerTitle({
  profile,
}: {
  profile: GbModProfile | null;
}) {
  return (
    <Group gap="xs">
      <Globe size={20} color="var(--color-accent-primary)" />
      {profile ? (
        <Group gap="xs">
          <Text fw={700} size="md">
            {profile._sName}
          </Text>
          {profile._aCategory && (
            <Badge size="xs" variant="light" color="gray">
              {profile._aCategory._sName}
            </Badge>
          )}
          {profile._sVersion && (
            <Badge size="xs" variant="outline" color="gray">
              v{formatVersion(profile._sVersion)}
            </Badge>
          )}
          {typeof profile._nDownloadCount === "number" && (
            <StatBadge
              icon={<Download size={12} />}
              value={profile._nDownloadCount}
            />
          )}
          {typeof profile._nLikeCount === "number" && (
            <StatBadge icon={<Heart size={12} />} value={profile._nLikeCount} />
          )}
          {typeof profile._nViewCount === "number" && (
            <StatBadge icon={<Eye size={12} />} value={profile._nViewCount} />
          )}
        </Group>
      ) : (
        <Text fw={700} size="md">
          Mod details
        </Text>
      )}
    </Group>
  );
}
