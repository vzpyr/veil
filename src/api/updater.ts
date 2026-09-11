import { fetchModProfile, GbModFile, GbModProfile } from "./gamebanana";
import { formatVersion } from "../utils";
import { ModItem, ModUpdateInfo } from "../types";

function compareVersions(local: string, remote: string): number {
  const cleanLocal = local.trim().replace(/^[vV]/, "");
  const cleanRemote = remote.trim().replace(/^[vV]/, "");

  const localParts = cleanLocal.split(/[.-]/).map((p) => parseInt(p, 10));
  const remoteParts = cleanRemote.split(/[.-]/).map((p) => parseInt(p, 10));

  const maxLen = Math.max(localParts.length, remoteParts.length);
  for (let i = 0; i < maxLen; i++) {
    const l = isNaN(localParts[i]) ? 0 : localParts[i];
    const r = isNaN(remoteParts[i]) ? 0 : remoteParts[i];
    if (r > l) return 1;
    if (r < l) return -1;
  }

  return cleanLocal !== cleanRemote ? 1 : 0;
}

export async function checkModUpdate(
  mod: ModItem,
): Promise<ModUpdateInfo | null> {
  if (!mod.gamebanana_id) {
    return null;
  }

  try {
    const profile: GbModProfile = await fetchModProfile(mod.gamebanana_id);
    const remoteVersion = profile._sVersion?.trim();
    const files: GbModFile[] = profile._aFiles || [];

    const sortedFiles = [...files].sort((a, b) => {
      const dateDiff = (b._tsDateAdded || 0) - (a._tsDateAdded || 0);
      if (dateDiff !== 0) return dateDiff;
      return b._idRow - a._idRow;
    });

    const latestFile = sortedFiles[0];
    let isUpdate = false;

    if (mod.version && remoteVersion) {
      const cmp = compareVersions(mod.version, remoteVersion);
      if (cmp > 0) {
        isUpdate = true;
      }
    }

    if (!isUpdate && mod.file_id && latestFile) {
      if (latestFile._idRow > mod.file_id) {
        isUpdate = true;
      }
    }

    return {
      available: isUpdate,
      latestVersion: formatVersion(remoteVersion),
      latestFileId: latestFile?._idRow,
      latestFileName: latestFile?._sFile,
      gamebananaId: mod.gamebanana_id,
    };
  } catch {
    return null;
  }
}

export async function checkModsUpdates(
  mods: ModItem[],
): Promise<Record<string, ModUpdateInfo>> {
  const targetMods = mods.filter((m) => Boolean(m.gamebanana_id));
  const results: Record<string, ModUpdateInfo> = {};

  const concurrency = 4;
  for (let i = 0; i < targetMods.length; i += concurrency) {
    const chunk = targetMods.slice(i, i + concurrency);
    const chunkResults = await Promise.all(
      chunk.map(async (mod) => {
        const info = await checkModUpdate(mod);
        return { id: mod.id, info };
      }),
    );

    for (const { id, info } of chunkResults) {
      if (info) {
        results[id] = info;
      }
    }
  }

  return results;
}
