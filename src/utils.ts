import { ConflictGroup, ModItem } from "./types";

export function formatVersion(version?: string | null): string | undefined {
  const trimmed = version?.trim();
  if (!trimmed) {
    return undefined;
  }
  return /^[vV]\d/.test(trimmed) ? trimmed.slice(1) : trimmed;
}

export function detectConflicts(mods: ModItem[]): ConflictGroup[] {
  const hashToMods = new Map<string, Set<string>>();
  const modIdToName = new Map<string, string>();

  for (const item of mods) {
    if (!item.enabled) {
      continue;
    }
    modIdToName.set(item.id, item.name);
    for (const hash of item.hashes) {
      if (!hashToMods.has(hash)) {
        hashToMods.set(hash, new Set());
      }
      hashToMods.get(hash)!.add(item.id);
    }
  }

  const modSetToHashes = new Map<
    string,
    { modIds: string[]; hashes: Set<string> }
  >();
  for (const [hash, modIdsSet] of hashToMods.entries()) {
    if (modIdsSet.size > 1) {
      const sortedModIds = Array.from(modIdsSet).sort();
      const key = sortedModIds.join("::");
      if (!modSetToHashes.has(key)) {
        modSetToHashes.set(key, { modIds: sortedModIds, hashes: new Set() });
      }
      modSetToHashes.get(key)!.hashes.add(hash);
    }
  }

  const conflicts: ConflictGroup[] = [];
  for (const { modIds, hashes } of modSetToHashes.values()) {
    const modNames = modIds.map((id) => modIdToName.get(id) || id);
    conflicts.push({
      hashes: Array.from(hashes).sort(),
      mod_ids: modIds,
      mod_names: modNames,
    });
  }

  return conflicts;
}
