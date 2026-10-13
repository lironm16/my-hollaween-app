"use client";

import { useEffect, useRef } from "react";
import { Circle, CircleMarker, Polyline, useMap, useMapEvents } from "react-leaflet";
import { clampGemAnchorPlacement, GEM_ANCHOR_PLACE_MAX_METERS } from "@/lib/gem-anchor-placement";
import type { LatLng } from "@/lib/route";

export type GemAnchorEditState = {
  house: LatLng;
  point: LatLng;
  onMove: (point: LatLng) => void;
};

function sameCoord(a: number, b: number) {
  return Math.abs(a - b) < 1e-7;
}

function samePoint(a: LatLng, b: LatLng) {
  return sameCoord(a.lat, b.lat) && sameCoord(a.lng, b.lng);
}

/** Pan the map under a fixed center pin; sync when `point` changes from controls outside the map. */
function GemAnchorMapInteraction({ house, point, onMove }: GemAnchorEditState) {
  const map = useMap();
  const programmaticRef = useRef(false);

  useEffect(() => {
    const center = map.getCenter();
    if (samePoint({ lat: center.lat, lng: center.lng }, point)) return;
    programmaticRef.current = true;
    map.setView([point.lat, point.lng], map.getZoom(), { animate: false });
    const id = window.requestAnimationFrame(() => {
      programmaticRef.current = false;
    });
    return () => window.cancelAnimationFrame(id);
  }, [map, point]);

  useMapEvents({
    moveend() {
      if (programmaticRef.current) return;
      const c = map.getCenter();
      const next = clampGemAnchorPlacement(house, { lat: c.lat, lng: c.lng });
      onMove(next);
      if (!samePoint({ lat: c.lat, lng: c.lng }, next)) {
        programmaticRef.current = true;
        map.setView([next.lat, next.lng], map.getZoom(), { animate: false });
        window.requestAnimationFrame(() => {
          programmaticRef.current = false;
        });
      }
    },
    click(event) {
      const next = clampGemAnchorPlacement(house, {
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
      onMove(next);
      programmaticRef.current = true;
      map.setView([next.lat, next.lng], map.getZoom(), { animate: true });
      window.requestAnimationFrame(() => {
        programmaticRef.current = false;
      });
    },
  });

  return null;
}

/** Owner/admin gem placement — pan the map under the center pin inside the allowed circle. */
export function MapGemAnchorEditLayer({ house, point, onMove }: GemAnchorEditState) {
  return (
    <>
      <Circle
        center={[house.lat, house.lng]}
        radius={GEM_ANCHOR_PLACE_MAX_METERS}
        pathOptions={{
          color: "#34d399",
          weight: 2,
          opacity: 0.7,
          fillColor: "#34d399",
          fillOpacity: 0.08,
          dashArray: "6 6",
        }}
        interactive={false}
      />
      <Polyline
        positions={[
          [house.lat, house.lng],
          [point.lat, point.lng],
        ]}
        pathOptions={{ color: "#34d399", weight: 2, opacity: 0.8, dashArray: "4 6", lineCap: "round" }}
        interactive={false}
      />
      <CircleMarker
        center={[house.lat, house.lng]}
        radius={6}
        pathOptions={{ color: "#fff7ed", weight: 2, fillColor: "#f97316", fillOpacity: 1 }}
        interactive={false}
      />
      <GemAnchorMapInteraction house={house} point={point} onMove={onMove} />
    </>
  );
}
