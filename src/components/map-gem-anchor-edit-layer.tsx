"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { Circle, CircleMarker, Polyline, useMap, useMapEvents } from "react-leaflet";
import {
  clampGemAnchorPlacement,
  expandBoundsToInclude,
  gemAnchorPlacementBounds,
  GEM_ANCHOR_PLACE_MAX_METERS,
} from "@/lib/gem-anchor-placement";
import { config } from "@/lib/config";
import type { LatLng } from "@/lib/route";

export type GemAnchorEditState = {
  house: LatLng;
  point: LatLng;
  onMove: (point: LatLng) => void;
  /** Bumped when the placement dialog opens — fit the 40 m circle in view once. */
  fitTick?: number;
  /** GPS «המיקום שלי» — shown even when outside the placement circle. */
  myLocation?: LatLng | null;
  myLocationAccuracyM?: number | null;
};

function sameCoord(a: number, b: number) {
  return Math.abs(a - b) < 1e-7;
}

function samePoint(a: LatLng, b: LatLng) {
  return sameCoord(a.lat, b.lat) && sameCoord(a.lng, b.lng);
}

function FitPlacementRadius({
  house,
  point,
  fitTick,
  myLocation,
  programmaticRef,
}: {
  house: LatLng;
  point: LatLng;
  fitTick?: number;
  myLocation?: LatLng | null;
  programmaticRef: MutableRefObject<boolean>;
}) {
  const map = useMap();
  const pointRef = useRef(point);
  pointRef.current = point;
  useEffect(() => {
    if (!fitTick) return;
    programmaticRef.current = true;
    const run = () => {
      const pin = pointRef.current;
      map.invalidateSize({ animate: false });
      const bounds = expandBoundsToInclude(
        gemAnchorPlacementBounds(house),
        myLocation ? [myLocation] : [],
      );
      map.fitBounds(bounds, {
        padding: [28, 28],
        maxZoom: config.map.maxZoom,
        animate: false,
      });
      map.setView([pin.lat, pin.lng], map.getZoom(), { animate: false });
      window.requestAnimationFrame(() => {
        programmaticRef.current = false;
      });
    };
    const timer = window.setTimeout(run, 60);
    return () => window.clearTimeout(timer);
    // Only when the dialog opens — not on every pin move (that blocked pinch-zoom).
  }, [map, house, fitTick, myLocation, programmaticRef]);
  return null;
}

/** Pan the map under a fixed center pin; sync when `point` changes from controls outside the map. */
function GemAnchorMapInteraction({
  house,
  point,
  onMove,
  programmaticRef,
}: GemAnchorEditState & { programmaticRef: MutableRefObject<boolean> }) {
  const map = useMap();
  const pointRef = useRef(point);
  pointRef.current = point;

  useEffect(() => {
    const center = map.getCenter();
    if (samePoint({ lat: center.lat, lng: center.lng }, point)) return;
    programmaticRef.current = true;
    map.invalidateSize({ animate: false });
    map.setView([point.lat, point.lng], map.getZoom(), { animate: false });
    const id = window.requestAnimationFrame(() => {
      programmaticRef.current = false;
    });
    return () => window.cancelAnimationFrame(id);
  }, [map, point, programmaticRef]);

  useMapEvents({
    /** Pan only — moveend also fires after zoom and would shift coords under the fixed center pin. */
    dragend() {
      if (programmaticRef.current) return;
      const c = map.getCenter();
      const next = clampGemAnchorPlacement(house, { lat: c.lat, lng: c.lng });
      if (samePoint(next, pointRef.current)) return;
      onMove(next);
      if (!samePoint({ lat: c.lat, lng: c.lng }, next)) {
        programmaticRef.current = true;
        map.setView([next.lat, next.lng], map.getZoom(), { animate: false });
        window.requestAnimationFrame(() => {
          programmaticRef.current = false;
        });
      }
    },
    /** Wheel/pinch zoom moves the map under the overlay pin — keep the same lat/lng after zoom. */
    zoomend() {
      if (programmaticRef.current) return;
      const pin = pointRef.current;
      const center = map.getCenter();
      if (samePoint({ lat: center.lat, lng: center.lng }, pin)) return;
      programmaticRef.current = true;
      map.setView([pin.lat, pin.lng], map.getZoom(), { animate: false });
      window.requestAnimationFrame(() => {
        programmaticRef.current = false;
      });
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
export function MapGemAnchorEditLayer({
  house,
  point,
  onMove,
  fitTick,
  myLocation = null,
  myLocationAccuracyM = null,
}: GemAnchorEditState) {
  const programmaticRef = useRef(false);
  const acc =
    myLocationAccuracyM != null && myLocationAccuracyM > 8 && myLocationAccuracyM < 120
      ? myLocationAccuracyM
      : null;
  return (
    <>
      <FitPlacementRadius
        house={house}
        point={point}
        fitTick={fitTick}
        myLocation={myLocation}
        programmaticRef={programmaticRef}
      />
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
      {myLocation ? (
        <>
          {acc != null ? (
            <Circle
              center={[myLocation.lat, myLocation.lng]}
              radius={acc}
              pathOptions={{
                color: "#38bdf8",
                weight: 1,
                opacity: 0.55,
                fillColor: "#38bdf8",
                fillOpacity: 0.12,
              }}
              interactive={false}
            />
          ) : null}
          <CircleMarker
            center={[myLocation.lat, myLocation.lng]}
            radius={7}
            pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#0ea5e9", fillOpacity: 1 }}
            interactive={false}
          />
        </>
      ) : null}
      <GemAnchorMapInteraction
        house={house}
        point={point}
        onMove={onMove}
        programmaticRef={programmaticRef}
      />
    </>
  );
}
