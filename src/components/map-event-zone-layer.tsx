"use client";

import { Fragment } from "react";
import { Polygon } from "react-leaflet";
import {
  eventNeighborhoodGeoJsonFeature,
  eventNeighborhoodPolygonIds,
  eventNeighborhoodPolygonRings,
} from "@/lib/event-neighborhood-polygons";

const HOOD_COLORS: Record<string, string> = {
  הגפן: "#34d399",
  חרוזים: "#fb923c",
  "שיכון ותיקים": "#a78bfa",
  "נחלת גנים": "#f472b6",
};

function latLngRings(id: string) {
  return eventNeighborhoodPolygonRings(id as Parameters<typeof eventNeighborhoodPolygonRings>[0]).map(
    (ring) => ring.map(([lng, lat]) => [lat, lng] as [number, number]),
  );
}

/** Event hood outlines (GovMap שכונות, Ramat Gan). */
export function MapEventZoneLayer() {
  const ids = eventNeighborhoodPolygonIds();
  if (ids.length === 0) return null;
  return (
    <>
      {ids.map((id) => {
        const feature = eventNeighborhoodGeoJsonFeature(id);
        if (!feature) return null;
        const color = HOOD_COLORS[id] ?? "#fde68a";
        const rings = latLngRings(id);
        return (
          <Fragment key={id}>
            {rings.map((positions, ringIdx) => (
              <Polygon
                key={`${id}-${ringIdx}`}
                positions={positions}
                pathOptions={{
                  color,
                  weight: 2,
                  opacity: 0.85,
                  fillColor: color,
                  fillOpacity: 0.08,
                  dashArray: "6 4",
                }}
              />
            ))}
          </Fragment>
        );
      })}
    </>
  );
}
