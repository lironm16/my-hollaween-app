import type { EventBoundaryKind, EventBoundaryZone } from "@/lib/event-boundary";
import { pointInGeoPolygon } from "@/lib/event-boundary-street-geom";

type AreaGeom = GeoJSON.Polygon | GeoJSON.MultiPolygon;

function isAreaGeom(g: GeoJSON.Geometry | undefined): g is AreaGeom {
  return g?.type === "Polygon" || g?.type === "MultiPolygon";
}

function verticesOf(geom: AreaGeom): [number, number][] {
  if (geom.type === "Polygon") {
    return geom.coordinates.flat() as [number, number][];
  }
  return geom.coordinates.flatMap((poly) => poly.flat()) as [number, number][];
}

/** True when every vertex of inner lies inside outer (same city/hood envelope). */
export function areaGeometryEntirelyInside(inner: AreaGeom, outer: AreaGeom): boolean {
  const verts = verticesOf(inner);
  if (verts.length === 0) return false;
  for (const [lng, lat] of verts) {
    if (!pointInGeoPolygon(lng, lat, outer)) return false;
  }
  return true;
}

/** More specific kinds are dropped when fully inside a broader selected zone. */
const KIND_SPECIFICITY: Record<EventBoundaryKind, number> = {
  city: 0,
  neighborhood: 1,
  street: 2,
};

/**
 * Drop inner zones fully contained in an outer selected zone:
 * - street inside שכונה or עיר
 * - שכונה inside עיר
 */
export function pruneZonesContainedInParents(
  zones: EventBoundaryZone[],
  geometries: Map<string, AreaGeom>,
): EventBoundaryZone[] {
  if (zones.length < 2) return zones;

  const toDrop = new Set<string>();

  for (const zone of zones) {
    const inner = geometries.get(zone.id);
    if (!inner) continue;
    const innerRank = KIND_SPECIFICITY[zone.kind];

    for (const parent of zones) {
      if (parent.id === zone.id) continue;
      const outer = geometries.get(parent.id);
      if (!outer) continue;
      const outerRank = KIND_SPECIFICITY[parent.kind];
      if (innerRank <= outerRank) continue;

      if (areaGeometryEntirelyInside(inner, outer)) {
        toDrop.add(zone.id);
        break;
      }
    }
  }

  if (toDrop.size === 0) return zones;
  return zones.filter((z) => !toDrop.has(z.id));
}

export function geometriesFromMapFeatures(
  features: GeoJSON.Feature<GeoJSON.Geometry | null, { id?: string }>[],
): Map<string, AreaGeom> {
  const map = new Map<string, AreaGeom>();
  for (const f of features) {
    const id = f.properties?.id;
    const geom = f.geometry;
    if (!id || !geom || !isAreaGeom(geom)) continue;
    map.set(id, geom);
  }
  return map;
}
