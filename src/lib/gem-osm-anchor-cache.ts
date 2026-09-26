import type { GemOsmAnchorEntry, GemOsmAnchorFile } from "@/lib/gem-osm-anchor-data";
import bundled from "../../public/gem-osm-anchors.json";

let file: GemOsmAnchorFile | null = null;

function loadFile(): GemOsmAnchorFile {
  if (file) return file;
  const raw = bundled as GemOsmAnchorFile;
  file =
    raw?.version === 1 && raw.anchors && typeof raw.anchors === "object"
      ? raw
      : { version: 1, generatedAt: "", anchors: {} };
  return file;
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
