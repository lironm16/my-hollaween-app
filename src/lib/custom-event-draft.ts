export type CustomEventDraft = {
  version: 1;
  /** Display name the host chooses (e.g. "הלואין הגפן 2026"). */
  title: string;
  /** Gov neighborhood stable ids from gov-neighborhoods layer. */
  neighborhoodIds: string[];
  updatedAt: string;
};

const STORAGE_KEY = "hallowhood-custom-event-draft-v1";

export function emptyCustomEventDraft(): CustomEventDraft {
  return {
    version: 1,
    title: "",
    neighborhoodIds: [],
    updatedAt: new Date().toISOString(),
  };
}

export function loadCustomEventDraft(): CustomEventDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CustomEventDraft;
    if (parsed.version !== 1 || !Array.isArray(parsed.neighborhoodIds)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCustomEventDraft(draft: CustomEventDraft): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...draft, updatedAt: new Date().toISOString() }));
}

export function clearCustomEventDraft(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
