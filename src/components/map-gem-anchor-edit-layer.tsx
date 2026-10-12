"use client";

import { useMemo } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Circle, Marker, Polyline, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { ImpDemonFilledIcon } from "@/components/imp-demon-reference-icon";
import { clampGemAnchorPlacement, GEM_ANCHOR_PLACE_MAX_METERS } from "@/lib/gem-anchor-placement";
import type { LatLng } from "@/lib/route";

const ICON_SIZE = 44;

export type GemAnchorEditState = {
  house: LatLng;
  point: LatLng;
  onMove: (point: LatLng) => void;
};

function MoveOnTap({ house, onMove }: Pick<GemAnchorEditState, "house" | "onMove">) {
  useMapEvents({
    click(event) {
      onMove(clampGemAnchorPlacement(house, { lat: event.latlng.lat, lng: event.latlng.lng }));
    },
  });
  return null;
}

/** Owner/admin gem placement — drag the demon (or tap the map) inside the allowed circle. */
export function MapGemAnchorEditLayer({ house, point, onMove }: GemAnchorEditState) {
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "map-gem-diamond-leaflet-icon",
        html: `<div class="map-gem-diamond-marker map-gem-diamond-marker--admin is-calibrated is-editing" aria-hidden="true">
          <span class="map-gem-imp-marker__glyph">${renderToStaticMarkup(
            <ImpDemonFilledIcon className="map-gem-imp-marker__svg size-full" />,
          )}</span>
        </div>`,
        iconSize: [ICON_SIZE, ICON_SIZE],
        iconAnchor: [ICON_SIZE / 2, ICON_SIZE / 2],
      }),
    [],
  );

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
      <MoveOnTap house={house} onMove={onMove} />
      <Marker
        position={[point.lat, point.lng]}
        icon={icon}
        draggable
        zIndexOffset={9500}
        eventHandlers={{
          dragend: (event) => {
            const marker = event.target as L.Marker;
            const raw = marker.getLatLng();
            const next = clampGemAnchorPlacement(house, { lat: raw.lat, lng: raw.lng });
            marker.setLatLng([next.lat, next.lng]);
            onMove(next);
          },
        }}
      />
    </>
  );
}
