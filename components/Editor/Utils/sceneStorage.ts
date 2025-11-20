export const getSceneStorageKey = (
  contentPath?: string | null,
  isPSDImport?: boolean
): string | undefined => {
  if (!contentPath) return undefined;
  return isPSDImport ? `${contentPath}.json` : contentPath;
};

export const getArchiveFileName = (storageKey?: string | null): string | undefined => {
  if (!storageKey) return undefined;

  if (storageKey.toLowerCase().endsWith(".json")) {
    return storageKey.replace(/\.json$/i, ".scene");
  }

  return `${storageKey}.scene`;
};
