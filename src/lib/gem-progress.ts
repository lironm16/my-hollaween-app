const COLLECTED_KEY = "hw-gem-collected";
const CHANGED_EVENT = "hw-gem-changed";

export type GemCollectionEntry = {
  houseId: string;
  collectedAt: number;
  gemType: string;
};

export function loadGemCollected(): GemCollectionEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(COLLECTED_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is GemCollectionEntry =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as GemCollectionEntry).houseId === "string" &&
          typeof (item as GemCollectionEntry).collectedAt === "number",
      )
      .slice(0, 300);
  } catch {
    return [];
  }
}

export function loadGemCollectedIds(): string[] {
  return loadGemCollected().map((item) => item.houseId);
}

export function isGemCollected(houseId: string) {
  return loadGemCollectedIds().includes(houseId);
}

function notifyChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

export function collectGem(entry: Omit<GemCollectionEntry, "collectedAt"> & { collectedAt?: number }) {
  const current = loadGemCollected();
  if (current.some((item) => item.houseId === entry.houseId)) {
    return current;
  }
  const next: GemCollectionEntry[] = [
    {
      houseId: entry.houseId,
      gemType: entry.gemType,
      collectedAt: entry.collectedAt ?? Date.now(),
    },
    ...current,
  ].slice(0, 300);
  localStorage.setItem(COLLECTED_KEY, JSON.stringify(next));
  notifyChanged();
  return next;
}

export { CHANGED_EVENT as GEM_CHANGED_EVENT };
