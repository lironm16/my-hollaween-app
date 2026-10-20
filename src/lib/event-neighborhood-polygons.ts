import type { NeighborhoodId } from "@/lib/config";

/** GeoJSON order: [longitude, latitude]. Rings must be closed (first = last). */
export type EventZoneRing = [number, number][];

/**
 * Event hood outlines (HallowHood-defined, not OSM).
 * Keep in sync with `public/event-zones/*.geojson`.
 */
export const EVENT_NEIGHBORHOOD_POLYGON_RINGS: Partial<Record<NeighborhoodId, EventZoneRing>> = {
  הגפן: [
    [34.8098, 32.08835],
    [34.81255, 32.08835],
    [34.8138, 32.08872],
    [34.8138, 32.0908],
    [34.8114, 32.0908],
    [34.8098, 32.09035],
    [34.8098, 32.08835],
  ],
};

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

export function eventNeighborhoodPolygonRing(id: NeighborhoodId): EventZoneRing | null {
  const ring = EVENT_NEIGHBORHOOD_POLYGON_RINGS[id];
  return ring?.length ? ring : null;
}

export function pointInEventNeighborhoodPolygon(id: NeighborhoodId, lat: number, lng: number): boolean {
  const ring = eventNeighborhoodPolygonRing(id);
  if (!ring) return false;
  return pointInEventZoneRing(lng, lat, ring);
}

export function eventNeighborhoodPolygonIds(): NeighborhoodId[] {
  return Object.keys(EVENT_NEIGHBORHOOD_POLYGON_RINGS) as NeighborhoodId[];
}

export function eventNeighborhoodGeoJsonFeature(id: NeighborhoodId) {
  const ring = eventNeighborhoodPolygonRing(id);
  if (!ring) return null;
  return {
    type: "Feature" as const,
    properties: { id, name: id, source: "hallowhood-event" },
    geometry: { type: "Polygon" as const, coordinates: [ring] },
  };
}
