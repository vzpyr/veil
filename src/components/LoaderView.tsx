import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  Loader,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { invoke } from "@tauri-apps/api/core";
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Download,
  FolderCog,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { LoaderRelease, NteLoaderStatus } from "../types";

interface LoaderViewProps {
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

export default function LoaderView({
  gameDir,
  onNavigateToSettings,
}: LoaderViewProps) {
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
  const [status, setStatus] = useState<NteLoaderStatus | null>(null);
  const [isLoadingReleases, setIsLoadingReleases] = useState<boolean>(false);
  const [isInstallingAsi, setIsInstallingAsi] = useState<boolean>(false);
  const [isInstallingSig, setIsInstallingSig] = useState<boolean>(false);
  const [isUninstallingAsi, setIsUninstallingAsi] = useState<boolean>(false);
  const [isUninstallingSig, setIsUninstallingSig] = useState<boolean>(false);

  const fetchStatus = useCallback(async () => {
    if (!gameDir) return;
    try {
      const res = await invoke<NteLoaderStatus>("get_nte_status", {
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
        invoke<LoaderRelease[]>("get_nte_asi_loader_releases"),
        invoke<LoaderRelease[]>("get_nte_sig_bypasser_releases"),
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
        title: "Release Fetch Error",
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
      await invoke("install_nte_asi_loader", {
        gameDir,
        downloadUrl: release.download_url,
        version: release.tag_name,
        dllName: selectedDllName,
      });
      await fetchStatus();
      notifications.show({
        title: "Installed Successfully",
        message: `Ultimate ASI Loader ${release.tag_name} installed as ${selectedDllName}.`,
        color: "green",
      });
    } catch (err) {
      notifications.show({
        title: "Installation Failed",
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
      await invoke("uninstall_nte_asi_loader", { gameDir });
      await fetchStatus();
      notifications.show({
        title: "Uninstalled Successfully",
        message: "Ultimate ASI Loader was removed.",
        color: "green",
      });
    } catch (err) {
      notifications.show({
        title: "Uninstall Failed",
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
      await invoke("install_nte_sig_bypasser", {
        gameDir,
        downloadUrl: release.download_url,
        version: release.tag_name,
        subpath: sigSubdir.trim() ? sigSubdir.trim() : null,
      });
      await fetchStatus();
      notifications.show({
        title: "Installed Successfully",
        message: `Universal Sig Bypasser ${release.tag_name} installed.`,
        color: "green",
      });
    } catch (err) {
      notifications.show({
        title: "Installation Failed",
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
      await invoke("uninstall_nte_sig_bypasser", { gameDir });
      await fetchStatus();
      notifications.show({
        title: "Uninstalled Successfully",
        message: "Universal Sig Bypasser was removed.",
        color: "green",
      });
    } catch (err) {
      notifications.show({
        title: "Uninstall Failed",
        message: String(err),
        color: "red",
      });
    } finally {
      setIsUninstallingSig(false);
    }
  };

  if (!gameDir) {
    return (
      <Box p="sm" maw="var(--max-width-settings)" mx="auto">
        <Card p="md" style={{ backgroundColor: "var(--color-bg-surface-1)" }}>
          <Stack gap="sm" align="center">
            <AlertTriangle size={36} color="var(--color-status-warning)" />
            <Text fw={700} size="md">
              Game Directory Not Configured
            </Text>
            <Text c="dimmed" size="xs" ta="center">
              Please select your Neverness to Everness base game directory in
              Settings before managing loader binaries.
            </Text>
            <Button
              size="xs"
              variant="default"
              leftSection={<FolderCog size={14} />}
              onClick={onNavigateToSettings}
            >
              Go to Settings
            </Button>
          </Stack>
        </Card>
      </Box>
    );
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

  const asiInstalled = Boolean(status?.asi_loader_installed);
  const sigInstalled = Boolean(status?.sig_bypasser_installed);

  return (
    <Box p="sm" maw="var(--max-width-settings)" mx="auto">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <div>
            <Text fw={700} size="md">
              Loader and Bypass Setup
            </Text>
            <Text c="dimmed" size="xs">
              Install and manage the x64 ASI loader and signature bypasser
              required for Neverness to Everness pak mods.
            </Text>
          </div>
          <Button
            size="xs"
            variant="subtle"
            leftSection={<RefreshCw size={14} />}
            loading={isLoadingReleases}
            onClick={() => {
              void fetchReleases();
              void fetchStatus();
            }}
          >
            Refresh
          </Button>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <Card
            p="sm"
            style={{
              backgroundColor: "var(--color-bg-card)",
              border: "1px solid var(--color-border-subtle)",
            }}
          >
            <Stack gap="sm">
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  <Cpu size={18} />
                  <Text fw={600} size="sm">
                    Ultimate ASI Loader
                  </Text>
                </Group>
                {asiInstalled ? (
                  <Badge
                    color="green"
                    variant="light"
                    size="sm"
                    leftSection={<CheckCircle2 size={12} />}
                  >
                    Installed
                  </Badge>
                ) : (
                  <Badge color="gray" variant="light" size="sm">
                    Not Installed
                  </Badge>
                )}
              </Group>

              <Text c="dimmed" size="xs">
                Injects custom ASI plugins and bypass libraries into the x64
                game process.
              </Text>

              {asiInstalled ? (
                <Stack gap="xs">
                  <Box
                    p="xs"
                    style={{
                      backgroundColor: "var(--color-bg-surface-2)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--color-border-subtle)",
                    }}
                  >
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">
                        Active DLL:
                      </Text>
                      <Text size="xs" fw={600}>
                        {status?.asi_loader_dll ?? "version.dll"}
                      </Text>
                    </Group>
                    {status?.asi_loader_version && (
                      <Group justify="space-between" mt="var(--space-3xs)">
                        <Text size="xs" c="dimmed">
                          Version:
                        </Text>
                        <Text size="xs" fw={600}>
                          {status.asi_loader_version}
                        </Text>
                      </Group>
                    )}
                  </Box>

                  <Button
                    size="xs"
                    color="red"
                    variant="light"
                    leftSection={<Trash2 size={14} />}
                    loading={isUninstallingAsi}
                    onClick={handleUninstallAsi}
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
                    data={asiOptions}
                    value={selectedAsiVersion}
                    onChange={setSelectedAsiVersion}
                    allowDeselect={false}
                    disabled={isLoadingReleases || isInstallingAsi}
                  />

                  <Select
                    size="xs"
                    label="DLL Name"
                    placeholder="Select DLL name"
                    data={dllOptions}
                    value={selectedDllName}
                    onChange={(val) => val && setSelectedDllName(val)}
                    allowDeselect={false}
                    disabled={isInstallingAsi}
                  />

                  <Button
                    size="xs"
                    variant="filled"
                    leftSection={<Download size={14} />}
                    loading={isInstallingAsi}
                    disabled={!selectedAsiVersion}
                    onClick={handleInstallAsi}
                  >
                    Install
                  </Button>
                </Stack>
              )}
            </Stack>
          </Card>

          <Card
            p="sm"
            style={{
              backgroundColor: "var(--color-bg-card)",
              border: "1px solid var(--color-border-subtle)",
            }}
          >
            <Stack gap="sm">
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  <ShieldCheck size={18} />
                  <Text fw={600} size="sm">
                    Universal Sig Bypasser
                  </Text>
                </Group>
                {sigInstalled ? (
                  <Badge
                    color="green"
                    variant="light"
                    size="sm"
                    leftSection={<CheckCircle2 size={12} />}
                  >
                    Installed
                  </Badge>
                ) : (
                  <Badge color="gray" variant="light" size="sm">
                    Not Installed
                  </Badge>
                )}
              </Group>

              <Text c="dimmed" size="xs">
                Bypasses signature and checksum checks so loose pak
                modifications load into the engine.
              </Text>

              {sigInstalled ? (
                <Stack gap="xs">
                  <Box
                    p="xs"
                    style={{
                      backgroundColor: "var(--color-bg-surface-2)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--color-border-subtle)",
                    }}
                  >
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">
                        Target File:
                      </Text>
                      <Text size="xs" fw={600}>
                        UniversalSigBypasser.asi
                      </Text>
                    </Group>
                    <Group justify="space-between" mt="var(--space-3xs)">
                      <Text size="xs" c="dimmed">
                        Subdirectory:
                      </Text>
                      <Text size="xs" fw={600}>
                        {status?.sig_bypasser_subpath
                          ? status.sig_bypasser_subpath
                          : "Root (Win64)"}
                      </Text>
                    </Group>
                    {status?.sig_bypasser_version && (
                      <Group justify="space-between" mt="var(--space-3xs)">
                        <Text size="xs" c="dimmed">
                          Version:
                        </Text>
                        <Text size="xs" fw={600}>
                          {status.sig_bypasser_version}
                        </Text>
                      </Group>
                    )}
                  </Box>

                  <Button
                    size="xs"
                    color="red"
                    variant="light"
                    leftSection={<Trash2 size={14} />}
                    loading={isUninstallingSig}
                    onClick={handleUninstallSig}
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
                    data={sigOptions}
                    value={selectedSigVersion}
                    onChange={setSelectedSigVersion}
                    allowDeselect={false}
                    disabled={isLoadingReleases || isInstallingSig}
                  />

                  <TextInput
                    size="xs"
                    label="Install Subdirectory"
                    description="Optional relative path inside Win64, e.g. plugins or OptiScaler\plugins"
                    placeholder="plugins (default: Win64 root)"
                    value={sigSubdir}
                    onChange={(e) => setSigSubdir(e.currentTarget.value)}
                    disabled={isInstallingSig}
                  />

                  <Button
                    size="xs"
                    variant="filled"
                    leftSection={<Download size={14} />}
                    loading={isInstallingSig}
                    disabled={!selectedSigVersion}
                    onClick={handleInstallSig}
                  >
                    Install
                  </Button>
                </Stack>
              )}
            </Stack>
          </Card>
        </SimpleGrid>
      </Stack>
    </Box>
  );
}
