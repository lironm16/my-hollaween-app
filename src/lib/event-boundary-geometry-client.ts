import type { EventBoundaryZone } from "@/lib/event-boundary";

type AreaGeom = GeoJSON.Polygon | GeoJSON.MultiPolygon;

/** Fetch boundary geometry for a single draft zone (event creator). */
export async function fetchEventBoundaryZoneGeometry(
  zone: EventBoundaryZone,
): Promise<AreaGeom | null> {
  const res = await fetch("/api/event-boundaries/geometry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ zones: [zone] }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { features?: GeoJSON.Feature[] };
  const geom = body.features?.[0]?.geometry;
  if (!geom || (geom.type !== "Polygon" && geom.type !== "MultiPolygon")) return null;
  return geom;
}
