import type { GovNeighborhoodCatalogEntry, GovNeighborhoodFeature } from "@/lib/gov-neighborhoods/types";

const NAME_KEYS = [
  "שם_שכונה",
  "shem_shchu",
  "SHEM_SHCHU",
  "neighborhood",
  "NEIGHBORHOOD",
  "name",
  "NAME",
] as const;

const CITY_KEYS = ["ישוב", "yishuv", "YISHUV", "city", "CITY", "settlement", "SETL_NAME"] as const;

const ID_KEYS = ["UniqueId", "uniqueId", "OBJECTID", "FID", "fid", "ms_shchuna"] as const;

function pickString(props: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const v = props[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return "";
}

export function govNeighborhoodName(props: Record<string, unknown>): string {
  return pickString(props, NAME_KEYS);
}

export function govNeighborhoodCity(props: Record<string, unknown>): string {
  return pickString(props, CITY_KEYS);
}

export function govNeighborhoodStableId(
  props: Record<string, unknown>,
  name: string,
  city: string,
): string {
  const explicit = pickString(props, ID_KEYS);
  if (explicit && city) return `${city}|${explicit}`;
  if (explicit) return explicit;
  const n = name || "unknown";
  const c = city || "unknown";
  return `${c}|${n}`;
}

type Bbox = [number, number, number, number];

function extendBbox(bbox: Bbox, lng: number, lat: number): Bbox {
  return [
    Math.min(bbox[0], lng),
    Math.min(bbox[1], lat),
    Math.max(bbox[2], lng),
    Math.max(bbox[3], lat),
  ];
}

function ringBbox(ring: number[][]): Bbox {
  let bbox: Bbox = [Infinity, Infinity, -Infinity, -Infinity];
  for (const pt of ring) {
    if (pt.length < 2) continue;
    const [lng, lat] = pt;
    bbox = extendBbox(bbox, lng, lat);
  }
  return bbox;
}

export function geometryBbox(geometry: GeoJSON.Geometry): Bbox | null {
  if (geometry.type === "Polygon") {
    return ringBbox(geometry.coordinates[0] ?? []);
  }
  if (geometry.type === "MultiPolygon") {
    let bbox: Bbox = [Infinity, Infinity, -Infinity, -Infinity];
    for (const poly of geometry.coordinates) {
      const part = ringBbox(poly[0] ?? []);
      bbox = [
        Math.min(bbox[0], part[0]),
        Math.min(bbox[1], part[1]),
        Math.max(bbox[2], part[2]),
        Math.max(bbox[3], part[3]),
      ];
    }
    if (!Number.isFinite(bbox[0])) return null;
    return bbox;
  }
  return null;
}

export function bboxCenter(bbox: Bbox): [number, number] {
  return [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2];
}

export function catalogEntryFromFeature(feature: GovNeighborhoodFeature): GovNeighborhoodCatalogEntry | null {
  const props = feature.properties ?? {};
  const name = govNeighborhoodName(props);
  if (!name) return null;
  const city = govNeighborhoodCity(props);
  const bbox = geometryBbox(feature.geometry);
  if (!bbox) return null;
  return {
    id: govNeighborhoodStableId(props, name, city),
    name,
    city,
    bbox,
    center: bboxCenter(bbox),
  };
}

/** Leaflet positions [lat,lng][] for the outer ring of a polygon feature. */
export function polygonLatLngRings(
  feature: GovNeighborhoodFeature,
): [number, number][][] {
  const geom = feature.geometry;
  if (geom.type === "Polygon") {
    const ring = geom.coordinates[0];
    if (!ring?.length) return [];
    return [ring.map(([lng, lat]) => [lat, lng] as [number, number])];
  }
  if (geom.type === "MultiPolygon") {
    return geom.coordinates
      .map((poly) => poly[0])
      .filter(Boolean)
      .map((ring) => ring.map(([lng, lat]) => [lat, lng] as [number, number]));
  }
  return [];
}
