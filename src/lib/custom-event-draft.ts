import type { EventBoundaryZone } from "@/lib/event-boundary";
import { zoneKeyNeighborhood } from "@/lib/event-boundary";

export type CustomEventDraft = {
  version: 2;
  title: string;
  zones: EventBoundaryZone[];
  updatedAt: string;
};

const STORAGE_KEY = "hallowhood-custom-event-draft-v2";

type LegacyDraftV1 = {
  version: 1;
  title: string;
  neighborhoodIds: string[];
  updatedAt: string;
};

export function emptyCustomEventDraft(): CustomEventDraft {
  return {
    version: 2,
    title: "",
    zones: [],
    updatedAt: new Date().toISOString(),
  };
}

function migrateV1(raw: LegacyDraftV1): CustomEventDraft {
  return {
    version: 2,
    title: raw.title ?? "",
    zones: (raw.neighborhoodIds ?? []).map((id) => ({
      kind: "neighborhood" as const,
      id: zoneKeyNeighborhood(id),
      label: id.includes("|") ? id.split("|").pop()! : id,
    })),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}

export function loadCustomEventDraft(): CustomEventDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const legacy = localStorage.getItem("hallowhood-custom-event-draft-v1");
    const parsed = raw
      ? (JSON.parse(raw) as CustomEventDraft | LegacyDraftV1)
      : legacy
        ? (JSON.parse(legacy) as LegacyDraftV1)
        : null;
    if (!parsed) return null;
    if (parsed.version === 2 && Array.isArray((parsed as CustomEventDraft).zones)) {
      return parsed as CustomEventDraft;
    }
    if (parsed.version === 1 && Array.isArray((parsed as LegacyDraftV1).neighborhoodIds)) {
      return migrateV1(parsed as LegacyDraftV1);
    }
    return null;
  } catch {
    return null;
  }
}

export function saveCustomEventDraft(draft: CustomEventDraft): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...draft, version: 2, updatedAt: new Date().toISOString() }),
  );
}

export function clearCustomEventDraft(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("hallowhood-custom-event-draft-v1");
}
