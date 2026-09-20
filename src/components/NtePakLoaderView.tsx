import { Box, SimpleGrid, Stack } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import { LoaderRelease, NtePakLoaderStatus } from "../types";
import AsiLoaderCard from "./AsiLoaderCard";
import LoaderEmptyState from "./LoaderEmptyState";
import LoaderHeader from "./LoaderHeader";
import SigBypasserCard from "./SigBypasserCard";

interface NtePakLoaderViewProps {
  gameDir?: string;
  onNavigateToSettings: () => void;
}

const DLL_NAME_OPTIONS = [
  { value: "version.dll", label: "version.dll (Recommended)" },
  { value: "dinput8.dll", label: "dinput8.dll" },
  { value: "dxgi.dll", label: "dxgi.dll" },
  { value: "dsound.dll", label: "dsound.dll" },
  { value: "winmm.dll", label: "winmm.dll" },
  { value: "winhttp.dll", label: "winhttp.dll" },
  { value: "wininet.dll", label: "wininet.dll" },
  { value: "d3d9.dll", label: "d3d9.dll" },
  { value: "d3d10.dll", label: "d3d10.dll" },
  { value: "d3d11.dll", label: "d3d11.dll" },
  { value: "d3d12.dll", label: "d3d12.dll" },
  { value: "binkw64.dll", label: "binkw64.dll" },
  { value: "bink2w64.dll", label: "bink2w64.dll" },
  { value: "xinput1_1.dll", label: "xinput1_1.dll" },
  { value: "xinput1_2.dll", label: "xinput1_2.dll" },
  { value: "xinput1_3.dll", label: "xinput1_3.dll" },
  { value: "xinput1_4.dll", label: "xinput1_4.dll" },
  { value: "xinput9_1_0.dll", label: "xinput9_1_0.dll" },
];

export default function NtePakLoaderView({
  gameDir,
  onNavigateToSettings,
}: NtePakLoaderViewProps) {
  const [asiReleases, setAsiReleases] = useState<LoaderRelease[]>([]);
  const [sigReleases, setSigReleases] = useState<LoaderRelease[]>([]);
  const [selectedAsiVersion, setSelectedAsiVersion] = useState<string | null>(
    null,
  );
  const [selectedSigVersion, setSelectedSigVersion] = useState<string | null>(
    null,
  );
  const [selectedDllName, setSelectedDllName] = useState<string>("version.dll");
  const [sigSubdir, setSigSubdir] = useState<string>("");
  const [status, setStatus] = useState<NtePakLoaderStatus | null>(null);
  const [isLoadingReleases, setIsLoadingReleases] = useState<boolean>(false);
  const [isInstallingAsi, setIsInstallingAsi] = useState<boolean>(false);
  const [isInstallingSig, setIsInstallingSig] = useState<boolean>(false);
  const [isUninstallingAsi, setIsUninstallingAsi] = useState<boolean>(false);
  const [isUninstallingSig, setIsUninstallingSig] = useState<boolean>(false);

  const fetchStatus = useCallback(async () => {
    if (!gameDir) return;
    try {
      const res = await invoke<NtePakLoaderStatus>("get_nte_pak_status", {
        gameDir,
      });
      setStatus(res);
      if (res.asi_loader_dll) {
        setSelectedDllName(res.asi_loader_dll);
      } else {
        const occupied = res.occupied_dlls ?? [];
        setSelectedDllName((current) => {
          if (occupied.includes(current)) {
            const firstAvailable = DLL_NAME_OPTIONS.find(
              (opt) => !occupied.includes(opt.value),
            );
            return firstAvailable ? firstAvailable.value : current;
          }
          return current;
        });
      }
      if (res.sig_bypasser_subpath) {
        setSigSubdir(res.sig_bypasser_subpath);
      }
    } catch {
      setStatus(null);
    }
  }, [gameDir]);

  const fetchReleases = useCallback(async () => {
    setIsLoadingReleases(true);
    try {
      const [asiList, sigList] = await Promise.all([
        invoke<LoaderRelease[]>("get_nte_pak_asi_loader_releases"),
        invoke<LoaderRelease[]>("get_nte_pak_sig_bypasser_releases"),
      ]);
      setAsiReleases(asiList);
      setSigReleases(sigList);
      if (asiList.length > 0 && !selectedAsiVersion) {
        setSelectedAsiVersion(asiList[0].tag_name);
      }
      if (sigList.length > 0 && !selectedSigVersion) {
        setSelectedSigVersion(sigList[0].tag_name);
      }
    } catch (err) {
      notifications.show({
        title: "Release fetch error",
        message: String(err),
        color: "red",
      });
    } finally {
      setIsLoadingReleases(false);
    }
  }, [selectedAsiVersion, selectedSigVersion]);

  useEffect(() => {
    void fetchReleases();
  }, [fetchReleases]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const handleInstallAsi = async () => {
    if (!gameDir) return;
    const release = asiReleases.find((r) => r.tag_name === selectedAsiVersion);
    if (!release) return;

    try {
      setIsInstallingAsi(true);
      await invoke("install_nte_pak_asi_loader", {
        gameDir,
        downloadUrl: release.download_url,
        version: release.tag_name,
        dllName: selectedDllName,
      });
      await fetchStatus();
      notifications.show({
        title: "Installed successfully",
        message: `Ultimate ASI Loader ${release.tag_name} installed as ${selectedDllName}.`,
        color: "green",
      });
    } catch (err) {
      notifications.show({
        title: "Installation failed",
        message: String(err),
        color: "red",
      });
    } finally {
      setIsInstallingAsi(false);
    }
  };

  const handleUninstallAsi = async () => {
    if (!gameDir) return;
    try {
      setIsUninstallingAsi(true);
      await invoke("uninstall_nte_pak_asi_loader", { gameDir });
      await fetchStatus();
      notifications.show({
        title: "Uninstalled successfully",
        message: "Ultimate ASI Loader was removed.",
        color: "green",
      });
    } catch (err) {
      notifications.show({
        title: "Uninstall failed",
        message: String(err),
        color: "red",
      });
    } finally {
      setIsUninstallingAsi(false);
    }
  };

  const handleInstallSig = async () => {
    if (!gameDir) return;
    const release = sigReleases.find((r) => r.tag_name === selectedSigVersion);
    if (!release) return;

    try {
      setIsInstallingSig(true);
      await invoke("install_nte_pak_sig_bypasser", {
        gameDir,
        downloadUrl: release.download_url,
        version: release.tag_name,
        subpath: sigSubdir.trim() ? sigSubdir.trim() : null,
      });
      await fetchStatus();
      notifications.show({
        title: "Installed successfully",
        message: `Universal Sig Bypasser ${release.tag_name} installed.`,
        color: "green",
      });
    } catch (err) {
      notifications.show({
        title: "Installation failed",
        message: String(err),
        color: "red",
      });
    } finally {
      setIsInstallingSig(false);
    }
  };

  const handleUninstallSig = async () => {
    if (!gameDir) return;
    try {
      setIsUninstallingSig(true);
      await invoke("uninstall_nte_pak_sig_bypasser", { gameDir });
      await fetchStatus();
      notifications.show({
        title: "Uninstalled successfully",
        message: "Universal Sig Bypasser was removed.",
        color: "green",
      });
    } catch (err) {
      notifications.show({
        title: "Uninstall failed",
        message: String(err),
        color: "red",
      });
    } finally {
      setIsUninstallingSig(false);
    }
  };

  if (!gameDir) {
    return <LoaderEmptyState onNavigateToSettings={onNavigateToSettings} />;
  }

  const asiOptions = asiReleases.map((r) => ({
    value: r.tag_name,
    label: r.tag_name === "Latest" ? "Latest (Recommended)" : r.tag_name,
  }));

  const sigOptions = sigReleases.map((r) => ({
    value: r.tag_name,
    label: r.tag_name === "Latest" ? "Latest (Recommended)" : r.tag_name,
  }));

  const occupiedDlls = status?.occupied_dlls ?? [];
  const dllOptions = DLL_NAME_OPTIONS.map((opt) => {
    const isOccupied = occupiedDlls.includes(opt.value);
    return {
      value: opt.value,
      label: isOccupied ? `${opt.label} (In use by another tool)` : opt.label,
      disabled: isOccupied,
    };
  });

  return (
    <Box p="sm" maw="var(--max-width-settings)" mx="auto">
      <Stack gap="md">
        <LoaderHeader
          isLoadingReleases={isLoadingReleases}
          onRefresh={() => {
            void fetchReleases();
            void fetchStatus();
          }}
        />

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <AsiLoaderCard
            installed={Boolean(status?.asi_loader_installed)}
            dllName={status?.asi_loader_dll ?? "version.dll"}
            version={status?.asi_loader_version}
            releaseOptions={asiOptions}
            selectedVersion={selectedAsiVersion}
            onVersionChange={setSelectedAsiVersion}
            dllOptions={dllOptions}
            selectedDllName={selectedDllName}
            onDllNameChange={setSelectedDllName}
            isLoadingReleases={isLoadingReleases}
            isInstalling={isInstallingAsi}
            isUninstalling={isUninstallingAsi}
            onInstall={handleInstallAsi}
            onUninstall={handleUninstallAsi}
          />

          <SigBypasserCard
            installed={Boolean(status?.sig_bypasser_installed)}
            subpath={status?.sig_bypasser_subpath}
            version={status?.sig_bypasser_version}
            releaseOptions={sigOptions}
            selectedVersion={selectedSigVersion}
            onVersionChange={setSelectedSigVersion}
            subdir={sigSubdir}
            onSubdirChange={setSigSubdir}
            isLoadingReleases={isLoadingReleases}
            isInstalling={isInstallingSig}
            isUninstalling={isUninstallingSig}
            onInstall={handleInstallSig}
            onUninstall={handleUninstallSig}
          />
        </SimpleGrid>
      </Stack>
    </Box>
  );
}
