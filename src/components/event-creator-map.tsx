"use client";

import { Fragment, useEffect, useMemo } from "react";
import { MapContainer, Polygon, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { config } from "@/lib/config";
import { useMapTiles } from "@/hooks/use-map-tiles";
import type { EventBoundaryKind } from "@/lib/event-boundary";
import type { EventBoundaryMapFeature } from "@/components/event-creator-map-types";

const KIND_COLORS: Record<EventBoundaryKind, string> = {
  city: "#38bdf8",
  neighborhood: "#34d399",
  street: "#fb923c",
};

const KIND_DRAW_ORDER: Record<EventBoundaryKind, number> = {
  city: 0,
  neighborhood: 1,
  street: 2,
};

export const EVENT_CREATOR_ISRAEL_BOUNDS: L.LatLngBoundsExpression = [
  [29.48, 34.17],
  [33.35, 35.92],
];

const ISRAEL_CENTER: [number, number] = [31.35, 35.1];

function ringsFromGeometry(geometry: GeoJSON.Geometry): [number, number][][] {
  if (geometry.type === "Polygon") {
    const ring = geometry.coordinates[0];
    if (!ring?.length) return [];
    return [ring.map(([lng, lat]) => [lat, lng] as [number, number])];
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.map((poly) =>
      (poly[0] ?? []).map(([lng, lat]) => [lat, lng] as [number, number]),
    );
  }
  return [];
}

function FitBounds({
  bounds,
  showCountry,
}: {
  bounds: L.LatLngBoundsExpression | null;
  showCountry: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (showCountry) {
      map.fitBounds(EVENT_CREATOR_ISRAEL_BOUNDS, { padding: [20, 20], maxZoom: 8 });
      return;
    }
    if (!bounds) return;
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
  }, [bounds, showCountry, map]);
  return null;
}

type Props = {
  features: EventBoundaryMapFeature[];
  selectedIds: string[];
  focusedId?: string | null;
  onAreaClick?: (featureId: string) => void;
  className?: string;
};

export function EventCreatorMap({
  features,
  selectedIds,
  focusedId = null,
  onAreaClick,
  className,
}: Props) {
  const { tiles } = useMapTiles();
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const showCountry = features.length === 0;

  const bounds = useMemo(() => {
    if (features.length === 0) return null;
    const b = L.latLngBounds([]);
    for (const f of features) {
      const rings = ringsFromGeometry(f.geometry);
      for (const ring of rings) {
        for (const [lat, lng] of ring) b.extend([lat, lng]);
      }
    }
    return b.isValid() ? b : null;
  }, [features]);

  return (
    <div className={className ?? "h-full w-full"}>
      <MapContainer
        center={showCountry ? ISRAEL_CENTER : [config.map.center.lat, config.map.center.lng]}
        zoom={showCountry ? 8 : config.map.zoom}
        minZoom={6}
        maxZoom={19}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution={tiles.attribution}
          url={tiles.url}
          subdomains={tiles.subdomains}
          maxNativeZoom={tiles.maxNativeZoom}
        />
        {tiles.labelsUrl ? (
          <TileLayer
            url={tiles.labelsUrl}
            subdomains={tiles.subdomains}
            maxNativeZoom={tiles.maxNativeZoom}
            zIndex={450}
          />
        ) : null}
        <FitBounds bounds={bounds} showCountry={showCountry} />
        {[...features]
          .map((feature, idx) => ({ feature, idx }))
          .sort((a, b) => {
            const ka = a.feature.properties?.kind ?? "neighborhood";
            const kb = b.feature.properties?.kind ?? "neighborhood";
            return (
              (KIND_DRAW_ORDER[ka as EventBoundaryKind] ?? 1) -
              (KIND_DRAW_ORDER[kb as EventBoundaryKind] ?? 1)
            );
          })
          .map(({ feature, idx }) => {
          const id = feature.properties?.id ?? String(idx);
          if (!selected.has(id)) return null;
          const kind = feature.properties?.kind ?? "neighborhood";
          const color = KIND_COLORS[kind];
          const isFocused = focusedId === id;
          const rings = ringsFromGeometry(feature.geometry);
          return (
            <Fragment key={id}>
              {rings.map((positions, ringIdx) => (
                <Polygon
                  key={`${id}-${ringIdx}`}
                  positions={positions}
                  pathOptions={{
                    color: isFocused ? "#fbbf24" : color,
                    weight: kind === "street" ? (isFocused ? 5 : 4) : isFocused ? 4 : 3,
                    opacity: 1,
                    fillColor: color,
                    fillOpacity: kind === "city" ? 0.12 : kind === "street" ? 0.38 : 0.28,
                    dashArray: kind === "city" ? "8 4" : undefined,
                  }}
                  eventHandlers={
                    onAreaClick
                      ? {
                          click: () => onAreaClick(id),
                        }
                      : undefined
                  }
                />
              ))}
            </Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
