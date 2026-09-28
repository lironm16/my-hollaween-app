import { distanceMeters } from "@/lib/geo";

/** Shape of `public/gem-osm-anchors.json` (built from OpenStreetMap via OSRM). */
export type GemOsmAnchorEntry = {
  lat: number;
  lng: number;
  /** Meters from house pin to snapped walk point. */
  distanceM: number;
  source: "osrm" | "overpass" | "spine";
  /** House map pin when this anchor was snapped (detect pin moves on edit). */
  pinLat?: number;
  pinLng?: number;
};

export type GemOsmAnchorFile = {
  version: 1;
  generatedAt: string;
  anchors: Record<string, GemOsmAnchorEntry>;
};

export const GEM_OSM_ANCHOR_MAX_PIN_DISTANCE_M = 120;
/** Cached sidewalk snap is stale after the house pin moves farther than this. */
export const GEM_OSM_ANCHOR_PIN_MOVE_TOLERANCE_M = 8;

export function attachGemAnchorPin(
  house: { lat: number; lng: number },
  entry: GemOsmAnchorEntry,
): GemOsmAnchorEntry {
  return { ...entry, pinLat: house.lat, pinLng: house.lng };
}

export function isGemOsmAnchorStale(
  house: { lat: number; lng: number },
  entry: GemOsmAnchorEntry,
): boolean {
  const point = { lat: entry.lat, lng: entry.lng };
  if (distanceMeters(house, point) > GEM_OSM_ANCHOR_MAX_PIN_DISTANCE_M) return true;
  if (
    typeof entry.pinLat === "number" &&
    typeof entry.pinLng === "number" &&
    Number.isFinite(entry.pinLat) &&
    Number.isFinite(entry.pinLng)
  ) {
    return (
      distanceMeters(house, { lat: entry.pinLat, lng: entry.pinLng }) >
      GEM_OSM_ANCHOR_PIN_MOVE_TOLERANCE_M
    );
  }
  // Pre-pin anchors from deploy-time JSON — re-snap after house edits.
  return true;
}
