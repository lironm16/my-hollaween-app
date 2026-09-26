import { appVersion } from "@/lib/app-version";
import type { GemOsmAnchorEntry, GemOsmAnchorFile } from "@/lib/gem-osm-anchor-data";
import bundled from "../../public/gem-osm-anchors.json";

let file: GemOsmAnchorFile = normalizeFile(bundled as GemOsmAnchorFile);
let fetchStarted = false;
let lastCatalogKey = "";

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

/** Bumped when `/gem-osm-anchors.json` is replaced — use to re-render map gems. */
export function gemOsmAnchorsEpoch(): string {
  return file.generatedAt || "bundled";
}

function loadFile(): GemOsmAnchorFile {
  return file;
}

/**
 * Fetch latest anchors from static JSON (same file Vercel build writes).
 * Bundled copy is only the first paint; this picks up deploy updates without a stale JS chunk.
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
    file = next;
    if (prevGenerated !== next.generatedAt || prevCount !== Object.keys(next.anchors).length) {
      notify();
    }
    return true;
  } catch {
    return false;
  }
}

export function ensureGemOsmAnchorsLoaded(catalogUpdatedAt?: string | null) {
  if (typeof window === "undefined") return;
  const key = catalogUpdatedAt ?? "";
  if (fetchStarted && lastCatalogKey === key) return;
  lastCatalogKey = key;
  fetchStarted = true;
  void refreshGemOsmAnchorsFromNetwork();
}

/** OSM-snapped sidewalk point for this house (from build-time cache), if any. */
export function getOsmGemAnchor(houseId: string): GemOsmAnchorEntry | null {
  const entry = loadFile().anchors[houseId];
  if (!entry || !Number.isFinite(entry.lat) || !Number.isFinite(entry.lng)) return null;
  return entry;
}

export function osmGemAnchorCount(): number {
  return Object.keys(loadFile().anchors).length;
}

/** For tests — reset in-memory cache. */
export function __resetGemOsmAnchorsForTests(next: GemOsmAnchorFile = normalizeFile(bundled as GemOsmAnchorFile)) {
  file = next;
  fetchStarted = false;
  notify();
}
