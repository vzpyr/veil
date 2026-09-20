import { Button, Select, Stack } from "@mantine/core";
import { Cpu, Download, Trash2 } from "lucide-react";
import LoaderCard, { LoaderInfoRows } from "./LoaderCard";

interface AsiLoaderCardProps {
  installed: boolean;
  dllName: string;
  version?: string;
  releaseOptions: { value: string; label: string }[];
  selectedVersion: string | null;
  onVersionChange: (value: string | null) => void;
  dllOptions: { value: string; label: string; disabled: boolean }[];
  selectedDllName: string;
  onDllNameChange: (value: string) => void;
  isLoadingReleases: boolean;
  isInstalling: boolean;
  isUninstalling: boolean;
  onInstall: () => void;
  onUninstall: () => void;
}

export default function AsiLoaderCard({
  installed,
  dllName,
  version,
  releaseOptions,
  selectedVersion,
  onVersionChange,
  dllOptions,
  selectedDllName,
  onDllNameChange,
  isLoadingReleases,
  isInstalling,
  isUninstalling,
  onInstall,
  onUninstall,
}: AsiLoaderCardProps) {
  const rows = [
    { label: "Active DLL:", value: dllName },
    ...(version ? [{ label: "Version:", value: version }] : []),
  ];

  return (
    <LoaderCard
      icon={<Cpu size={18} />}
      title="Ultimate ASI Loader"
      description="Injects custom ASI plugins and bypass libraries into the x64 game process."
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
            label="Release Version"
            placeholder="Select release"
            data={releaseOptions}
            value={selectedVersion}
            onChange={onVersionChange}
            allowDeselect={false}
            disabled={isLoadingReleases || isInstalling}
          />

          <Select
            size="xs"
            label="DLL Name"
            placeholder="Select DLL name"
            data={dllOptions}
            value={selectedDllName}
            onChange={(val) => val && onDllNameChange(val)}
            allowDeselect={false}
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
