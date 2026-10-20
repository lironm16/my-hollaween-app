"use client";

import { Polygon, Tooltip } from "react-leaflet";
import {
  eventNeighborhoodGeoJsonFeature,
  eventNeighborhoodPolygonIds,
} from "@/lib/event-neighborhood-polygons";

const HOOD_COLORS: Record<string, string> = {
  הגפן: "#34d399",
  חרוזים: "#fb923c",
  "שיכון ותיקים": "#a78bfa",
  "נחלת גנים": "#f472b6",
};

/** Admin QA — HallowHood event hood outlines (not OSM). */
export function MapEventZoneLayer() {
  const ids = eventNeighborhoodPolygonIds();
  if (ids.length === 0) return null;
  return (
    <>
      {ids.map((id) => {
        const feature = eventNeighborhoodGeoJsonFeature(id);
        if (!feature) return null;
        const ring = feature.geometry.coordinates[0].map(
          ([lng, lat]) => [lat, lng] as [number, number],
        );
        const color = HOOD_COLORS[id] ?? "#fde68a";
        return (
          <Polygon
            key={id}
            positions={ring}
            pathOptions={{
              color,
              weight: 2,
              opacity: 0.85,
              fillColor: color,
              fillOpacity: 0.08,
              dashArray: "6 4",
            }}
          >
            <Tooltip sticky direction="top">
              {id} · גבול אירוע HallowHood
            </Tooltip>
          </Polygon>
        );
      })}
    </>
  );
}
