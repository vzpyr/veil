import { Button, Select, Stack, TextInput } from "@mantine/core";
import { Download, ShieldCheck, Trash2 } from "lucide-react";
import LoaderCard, { LoaderInfoRows } from "./LoaderCard";

interface SigBypasserCardProps {
  installed: boolean;
  subpath?: string;
  version?: string;
  releaseOptions: { value: string; label: string }[];
  selectedVersion: string | null;
  onVersionChange: (value: string | null) => void;
  subdir: string;
  onSubdirChange: (value: string) => void;
  isLoadingReleases: boolean;
  isInstalling: boolean;
  isUninstalling: boolean;
  onInstall: () => void;
  onUninstall: () => void;
}

export default function SigBypasserCard({
  installed,
  subpath,
  version,
  releaseOptions,
  selectedVersion,
  onVersionChange,
  subdir,
  onSubdirChange,
  isLoadingReleases,
  isInstalling,
  isUninstalling,
  onInstall,
  onUninstall,
}: SigBypasserCardProps) {
  const rows = [
    { label: "Target file", value: "UniversalSigBypasser.asi" },
    { label: "Subdirectory", value: subpath ? subpath : "Root (Win64)" },
    ...(version ? [{ label: "Version", value: version }] : []),
  ];

  return (
    <LoaderCard
      icon={<ShieldCheck size={18} />}
      title="Universal Sig Bypasser"
      description="Bypasses signature and checksum checks so loose pak modifications load into the engine."
      installed={installed}
    >
      {installed ? (
        <Stack gap="xs">
          <LoaderInfoRows rows={rows} />

          <Button
            size="xs"
            color="red"
            variant="light"
            leftSection={<Trash2 size={14} />}
            loading={isUninstalling}
            onClick={onUninstall}
          >
            Uninstall
          </Button>
        </Stack>
      ) : (
        <Stack gap="xs">
          <Select
            size="xs"
            label="Release version"
            placeholder="Select release"
            data={releaseOptions}
            value={selectedVersion}
            onChange={onVersionChange}
            allowDeselect={false}
            disabled={isLoadingReleases || isInstalling}
          />

          <TextInput
            size="xs"
            label="Install subdirectory"
            description="Optional relative path inside Win64, e.g. plugins or OptiScaler\plugins"
            placeholder="plugins (default: Win64 root)"
            value={subdir}
            onChange={(e) => onSubdirChange(e.currentTarget.value)}
            disabled={isInstalling}
          />

          <Button
            size="xs"
            variant="filled"
            leftSection={<Download size={14} />}
            loading={isInstalling}
            disabled={!selectedVersion}
            onClick={onInstall}
          >
            Install
          </Button>
        </Stack>
      )}
    </LoaderCard>
  );
}
