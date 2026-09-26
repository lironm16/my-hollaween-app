import { appVersion } from "@/lib/app-version";
import { osrmNearestFootWalkFromBrowser } from "@/lib/gem-osrm-snap";
import type { GemOsmAnchorEntry, GemOsmAnchorFile } from "@/lib/gem-osm-anchor-data";
import bundled from "../../public/gem-osm-anchors.json";

let file: GemOsmAnchorFile = normalizeFile(bundled as GemOsmAnchorFile);
let fetchStarted = false;
let lastCatalogKey = "";
let loadGeneration = 0;

type Listener = () => void;
const listeners = new Set<Listener>();

function normalizeFile(raw: GemOsmAnchorFile): GemOsmAnchorFile {
  return raw?.version === 1 && raw.anchors && typeof raw.anchors === "object"
    ? raw
    : { version: 1, generatedAt: "", anchors: {} };
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeGemOsmAnchors(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Bumped when anchor file updates — use to re-render map gems. */
export function gemOsmAnchorsEpoch(): string {
  return file.generatedAt || "bundled";
}

function loadFile(): GemOsmAnchorFile {
  return file;
}

function anchorRank(source: GemOsmAnchorEntry["source"] | undefined): number {
  if (source === "osrm") return 3;
  if (source === "overpass") return 2;
  if (source === "spine") return 1;
  return 0;
}

function mergeAnchor(houseId: string, entry: GemOsmAnchorEntry): boolean {
  const prev = file.anchors[houseId];
  if (prev && anchorRank(prev.source) > anchorRank(entry.source)) return false;
  if (
    prev &&
    prev.lat === entry.lat &&
    prev.lng === entry.lng &&
    prev.source === entry.source
  ) {
    return false;
  }
  file.anchors[houseId] = entry;
  return true;
}

/**
 * Fetch latest anchors from `/api/gem-osm-anchors` (spines for live catalog) or static JSON fallback.
 */
export async function refreshGemOsmAnchorsFromNetwork(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const urls = [
      `/api/gem-osm-anchors?v=${encodeURIComponent(appVersion())}`,
      `/gem-osm-anchors.json?v=${encodeURIComponent(appVersion())}`,
    ];
    let next: GemOsmAnchorFile | null = null;
    for (const url of urls) {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      next = normalizeFile((await res.json()) as GemOsmAnchorFile);
      break;
    }
    if (!next) return false;
    const prevGenerated = file.generatedAt;
    const prevCount = Object.keys(file.anchors).length;
    let merged = false;
    file = {
      version: 1,
      generatedAt: next.generatedAt || file.generatedAt,
      anchors: { ...file.anchors },
    };
    for (const [houseId, entry] of Object.entries(next.anchors)) {
      if (mergeAnchor(houseId, entry)) merged = true;
    }
    if (
      merged ||
      prevGenerated !== file.generatedAt ||
      prevCount !== Object.keys(file.anchors).length
    ) {
      notify();
    }
    return true;
  } catch {
    return false;
  }
}

async function fetchOsrmSnap(lat: number, lng: number): Promise<GemOsmAnchorEntry | null> {
  try {
    const res = await fetch(
      `/api/gem-snap?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`,
      { cache: "no-store" },
    );
    if (res.ok) {
      const json = (await res.json()) as GemOsmAnchorEntry;
      if (Number.isFinite(json.lat) && Number.isFinite(json.lng)) {
        return { ...json, source: "osrm" };
      }
    }
  } catch {
    /* serverless OSRM often blocked — try browser */
  }
  const direct = await osrmNearestFootWalkFromBrowser({ lat, lng });
  return direct ? { ...direct, source: "osrm" } : null;
}

/** Refine spine anchors with per-house OSRM snap (batched — safe for Vercel). */
export async function hydrateGemAnchorsForHouses(
  houses: ReadonlyArray<{ id: string; lat: number; lng: number }>,
): Promise<number> {
  if (typeof window === "undefined") return 0;
  const pending = houses.filter((h) => {
    const cur = file.anchors[h.id];
    return !cur || cur.source !== "osrm";
  });
  if (pending.length === 0) return 0;

  const concurrency = 4;
  const gapMs = 60;
  let index = 0;
  let updated = 0;

  async function worker() {
    while (index < pending.length) {
      const i = index;
      index += 1;
      const house = pending[i]!;
      const snap = await fetchOsrmSnap(house.lat, house.lng);
      if (snap && mergeAnchor(house.id, snap)) updated += 1;
      if (i < pending.length - 1) await new Promise((r) => setTimeout(r, gapMs));
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, pending.length) }, () => worker()),
  );
  if (updated > 0) notify();
  return updated;
}

export function ensureGemOsmAnchorsLoaded(
  catalogUpdatedAt?: string | null,
  eligible?: ReadonlyArray<{ id: string; lat: number; lng: number; address?: string | null }>,
) {
  if (typeof window === "undefined") return;
  const key = `${catalogUpdatedAt ?? ""}|${eligible?.length ?? 0}`;
  if (fetchStarted && lastCatalogKey === key) return;
  lastCatalogKey = key;
  fetchStarted = true;
  const gen = ++loadGeneration;
  void (async () => {
    await refreshGemOsmAnchorsFromNetwork();
    if (gen !== loadGeneration) return;
    if (eligible?.length) await hydrateGemAnchorsForHouses(eligible);
  })();
}

/** Sidewalk / OSM-snapped point for this house when loaded. */
export function getOsmGemAnchor(houseId: string): GemOsmAnchorEntry | null {
  const entry = loadFile().anchors[houseId];
  if (!entry || !Number.isFinite(entry.lat) || !Number.isFinite(entry.lng)) return null;
  return entry;
}

export function osmGemAnchorCount(): number {
  return Object.keys(loadFile().anchors).length;
}

/** For tests — reset in-memory cache. */
export function __resetGemOsmAnchorsForTests(
  next: GemOsmAnchorFile = normalizeFile(bundled as GemOsmAnchorFile),
) {
  file = next;
  fetchStarted = false;
  lastCatalogKey = "";
  loadGeneration = 0;
  notify();
}
