import type { BoundarySearchHit } from "@/lib/event-boundary";
import { zoneKeyNeighborhood } from "@/lib/event-boundary";
import { pointInGeoPolygon } from "@/lib/event-boundary-street-geom";
import {
  buildGovNeighborhoodCatalog,
  govNeighborhoodDataAvailable,
  loadGovNeighborhoodById,
  loadGovNeighborhoodCatalogFromDisk,
} from "@/lib/gov-neighborhoods/load.server";
import type { GovNeighborhoodCatalogEntry } from "@/lib/gov-neighborhoods/types";

function pointInEntryBbox(lng: number, lat: number, bbox: GovNeighborhoodCatalogEntry["bbox"]): boolean {
  return lng >= bbox[0] && lng <= bbox[2] && lat >= bbox[1] && lat <= bbox[3];
}

function polygonArea(geom: GeoJSON.Polygon | GeoJSON.MultiPolygon): number {
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  let sum = 0;
  for (const poly of polys) {
    const ring = poly[0] as [number, number][];
    if (!ring?.length) continue;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [x1, y1] = ring[j];
      const [x2, y2] = ring[i];
      sum += x1 * y2 - x2 * y1;
    }
  }
  return Math.abs(sum / 2);
}

/** GovMap שכונה under a map tap (catalog bbox filter, then polygon hit test). */
export function pickGovNeighborhoodAtPoint(lat: number, lng: number): BoundarySearchHit | null {
  const catalog =
    loadGovNeighborhoodCatalogFromDisk() ??
    (govNeighborhoodDataAvailable() ? buildGovNeighborhoodCatalog() : null);
  if (!catalog) return null;

  const candidates = catalog.entries.filter((e) => pointInEntryBbox(lng, lat, e.bbox));
  if (candidates.length === 0) return null;

  let best: { entry: GovNeighborhoodCatalogEntry; area: number } | null = null;

  for (const entry of candidates) {
    const feature = loadGovNeighborhoodById(entry.id);
    const geom = feature?.geometry;
    if (!geom || (geom.type !== "Polygon" && geom.type !== "MultiPolygon")) continue;
    if (!pointInGeoPolygon(lng, lat, geom)) continue;
    const area = polygonArea(geom);
    if (!best || area < best.area) best = { entry, area };
  }

  if (!best) return null;

  const { entry } = best;
  return {
    kind: "neighborhood",
    id: zoneKeyNeighborhood(entry.id),
    label: entry.name,
    city: entry.city || undefined,
    subtitle: entry.city || undefined,
  };
}
