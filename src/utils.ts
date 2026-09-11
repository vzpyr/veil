export function formatVersion(version?: string | null): string | undefined {
  const trimmed = version?.trim();
  if (!trimmed) {
    return undefined;
  }
  return /^[vV]\d/.test(trimmed) ? trimmed.slice(1) : trimmed;
}
