import type { NeighborhoodId } from "@/lib/config";
import { NEIGHBORHOODS } from "@/lib/config";
import govRingsDoc from "@/lib/event-neighborhood-gov-rings.json";

/** GeoJSON order: [longitude, latitude]. Rings must be closed (first = last). */
export type EventZoneRing = [number, number][];

type GovRingsDoc = {
  version: number;
  hoods: Record<
    string,
    {
      source: string;
      govName: string;
      rings: EventZoneRing[];
    }
  >;
};

const govRings = govRingsDoc as unknown as GovRingsDoc;

/** Ray-casting point-in-polygon (lng/lat). */
export function pointInEventZoneRing(lng: number, lat: number, ring: EventZoneRing): boolean {
  if (ring.length < 4) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi + 0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function eventNeighborhoodPolygonRings(id: NeighborhoodId): EventZoneRing[] {
  const entry = govRings.hoods[id];
  return entry?.rings?.length ? entry.rings : [];
}

/** @deprecated use eventNeighborhoodPolygonRings — first outer ring if present */
export function eventNeighborhoodPolygonRing(id: NeighborhoodId): EventZoneRing | null {
  const rings = eventNeighborhoodPolygonRings(id);
  return rings[0]?.length ? rings[0] : null;
}

export function pointInEventNeighborhoodPolygon(id: NeighborhoodId, lat: number, lng: number): boolean {
  const rings = eventNeighborhoodPolygonRings(id);
  if (rings.length === 0) return false;
  return rings.some((ring) => pointInEventZoneRing(lng, lat, ring));
}

export function eventNeighborhoodPolygonIds(): NeighborhoodId[] {
  return NEIGHBORHOODS.filter((id) => eventNeighborhoodPolygonRings(id).length > 0);
}

export function eventNeighborhoodGeoJsonFeature(id: NeighborhoodId) {
  const rings = eventNeighborhoodPolygonRings(id);
  if (!rings.length) return null;
  if (rings.length === 1) {
    return {
      type: "Feature" as const,
      properties: { id, name: id, source: "govmap-shchunot" },
      geometry: { type: "Polygon" as const, coordinates: [rings[0]] },
    };
  }
  return {
    type: "Feature" as const,
    properties: { id, name: id, source: "govmap-shchunot" },
    geometry: {
      type: "MultiPolygon" as const,
      coordinates: rings.map((ring) => [ring]),
    },
  };
}
