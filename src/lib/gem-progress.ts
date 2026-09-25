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

/** True if this sticker type is already in the bag (any house), before a new collect. */
export function isGemTypeInCollection(gemType: string, entries: GemCollectionEntry[] = loadGemCollected()) {
  return entries.some((item) => item.gemType === gemType);
}

function notifyChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

/** Clear one house or the whole bag (achievements follow collected count). */
export function resetGemProgress(options?: { houseId?: string }) {
  if (typeof window === "undefined") return [];
  const houseId = options?.houseId?.trim();
  const next = houseId
    ? loadGemCollected().filter((item) => item.houseId !== houseId)
    : [];
  if (houseId) {
    localStorage.setItem(COLLECTED_KEY, JSON.stringify(next));
  } else {
    localStorage.removeItem(COLLECTED_KEY);
  }
  notifyChanged();
  return loadGemCollected();
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
