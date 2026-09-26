/** Shape of `public/gem-osm-anchors.json` (built from OpenStreetMap via OSRM). */
export type GemOsmAnchorEntry = {
  lat: number;
  lng: number;
  /** Meters from house pin to snapped walk point. */
  distanceM: number;
  source: "osrm" | "overpass";
};

export type GemOsmAnchorFile = {
  version: 1;
  generatedAt: string;
  anchors: Record<string, GemOsmAnchorEntry>;
};

export const GEM_OSM_ANCHOR_MAX_PIN_DISTANCE_M = 95;
