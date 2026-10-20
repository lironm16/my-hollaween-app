import type { EventBoundaryKind } from "@/lib/event-boundary";

export type EventBoundaryMapFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  { id?: string; label?: string; kind?: EventBoundaryKind; source?: string; fname?: string }
>;
