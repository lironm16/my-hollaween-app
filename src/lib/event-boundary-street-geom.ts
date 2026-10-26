import { pointInEventZoneRing } from "@/lib/event-neighborhood-polygons";

type NominatimLikeHit = {
  lat?: string;
  lon?: string;
  display_name?: string;
  geojson?: GeoJSON.Geometry;
  class?: string;
  type?: string;
};

export function pointInGeoPolygon(
  lng: number,
  lat: number,
  geom: GeoJSON.Polygon | GeoJSON.MultiPolygon,
): boolean {
  if (geom.type === "Polygon") {
    const [outer, ...holes] = geom.coordinates;
    if (!outer || !pointInEventZoneRing(lng, lat, outer as [number, number][])) return false;
    for (const hole of holes) {
      if (pointInEventZoneRing(lng, lat, hole as [number, number][])) return false;
    }
    return true;
  }
  return geom.coordinates.some((poly) =>
    pointInGeoPolygon(lng, lat, { type: "Polygon", coordinates: poly }),
  );
}

export function linesFromStreetGeometry(g: GeoJSON.Geometry): [number, number][][] {
  if (g.type === "LineString") {
    const line = g.coordinates as [number, number][];
    return line.length >= 2 ? [line] : [];
  }
  if (g.type === "MultiLineString") {
    return g.coordinates
      .map((c) => c as [number, number][])
      .filter((line) => line.length >= 2);
  }
  return [];
}

function normalizeToken(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[''""`]/g, "")
    .replace(/\s+/g, " ");
}

export function cityMentionedInHit(hit: NominatimLikeHit, city: string): boolean {
  const needle = normalizeToken(city);
  if (!needle) return false;
  const hay = normalizeToken(hit.display_name ?? "");
  return hay.includes(needle);
}

export function isHighwayLineHit(hit: NominatimLikeHit): boolean {
  if (!hit.geojson) return false;
  if (hit.geojson.type !== "LineString" && hit.geojson.type !== "MultiLineString") return false;
  const cls = (hit.class ?? "").toLowerCase();
  const typ = (hit.type ?? "").toLowerCase();
  if (cls === "highway") return true;
  return /road|street|residential|pedestrian|tertiary|secondary|primary|trunk|living_street|unclassified/.test(
    typ,
  );
}

function lineTouchesClip(
  line: [number, number][],
  clips: (GeoJSON.Polygon | GeoJSON.MultiPolygon)[],
): boolean {
  for (const [lng, lat] of line) {
    for (const clip of clips) {
      if (pointInGeoPolygon(lng, lat, clip)) return true;
    }
  }
  const mid = line[Math.floor(line.length / 2)];
  if (mid) {
    for (const clip of clips) {
      if (pointInGeoPolygon(mid[0], mid[1], clip)) return true;
    }
  }
  return false;
}

function lineMidpointInClip(
  line: [number, number][],
  clip: GeoJSON.Polygon | GeoJSON.MultiPolygon,
): boolean {
  const mid = line[Math.floor(line.length / 2)];
  return mid ? pointInGeoPolygon(mid[0], mid[1], clip) : false;
}

/** Pick OSM centerline(s) for a street — never treat area polygons as roads. */
export function pickStreetCenterlines(
  hits: NominatimLikeHit[],
  city: string,
  options?: {
    cityClip?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
    zoneClips?: (GeoJSON.Polygon | GeoJSON.MultiPolygon)[];
  },
): [number, number][][] {
  const highwayHits = hits.filter(isHighwayLineHit);
  const pool = highwayHits.length ? highwayHits : hits.filter((h) => linesFromStreetGeometry(h.geojson!).length);

  const lines: [number, number][][] = [];
  for (const hit of pool) {
    if (!hit.geojson) continue;
    lines.push(...linesFromStreetGeometry(hit.geojson));
  }
  if (lines.length === 0) return [];

  const zoneClips = options?.zoneClips?.filter(Boolean) ?? [];
  if (zoneClips.length) {
    const inZone = lines.filter((line) => lineTouchesClip(line, zoneClips));
    if (inZone.length) return inZone;
  }

  const cityClip = options?.cityClip;
  if (cityClip) {
    const inCity = lines.filter((line) => lineMidpointInClip(line, cityClip));
    if (inCity.length) return inCity;
  }

  const nameMatch = pool.filter((h) => cityMentionedInHit(h, city));
  if (nameMatch.length) {
    const matchedLines: [number, number][][] = [];
    for (const hit of nameMatch) {
      if (!hit.geojson) continue;
      matchedLines.push(...linesFromStreetGeometry(hit.geojson));
    }
    if (matchedLines.length) return matchedLines;
  }

  return [lines.reduce((a, b) => (a.length >= b.length ? a : b))];
}
