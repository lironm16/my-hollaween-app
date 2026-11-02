export type EventBoundaryKind = "city" | "neighborhood" | "street" | "point";

/** One selectable zone in a host-defined event. */
export type EventBoundaryZone = {
  kind: EventBoundaryKind;
  /** Stable key (see zoneKey helpers). */
  id: string;
  label: string;
  /** Parent city — required for street; optional hint for neighborhood. */
  city?: string;
  /** Pin for kind `point`. */
  lat?: number;
  lng?: number;
};

export function zoneKeyNeighborhood(govId: string): string {
  return `n:${govId}`;
}

export function zoneKeyCity(city: string): string {
  return `c:${city.trim()}`;
}

export function zoneKeyStreet(city: string, street: string): string {
  return `s:${city.trim()}|${street.trim()}`;
}

export function roundEventBoundaryCoord(n: number): number {
  return Math.round(n * 1e5) / 1e5;
}

export function zoneKeyPoint(lat: number, lng: number): string {
  return `p:${roundEventBoundaryCoord(lat)},${roundEventBoundaryCoord(lng)}`;
}

export function parsePointZoneCoords(rest: string): { lat: number; lng: number } | null {
  const [latRaw, lngRaw] = rest.split(",");
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function parseZoneKey(id: string): { kind: EventBoundaryKind; rest: string } | null {
  if (id.startsWith("n:")) return { kind: "neighborhood", rest: id.slice(2) };
  if (id.startsWith("c:")) return { kind: "city", rest: id.slice(2) };
  if (id.startsWith("s:")) return { kind: "street", rest: id.slice(2) };
  if (id.startsWith("p:")) return { kind: "point", rest: id.slice(2) };
  return null;
}

export function toggleZone(list: EventBoundaryZone[], zone: EventBoundaryZone): EventBoundaryZone[] {
  const i = list.findIndex((z) => z.id === zone.id);
  if (i >= 0) return list.filter((_, j) => j !== i);
  return [...list, zone];
}

export type BoundarySearchHit = {
  kind: EventBoundaryKind;
  id: string;
  label: string;
  city?: string;
  subtitle?: string;
  lat?: number;
  lng?: number;
};
