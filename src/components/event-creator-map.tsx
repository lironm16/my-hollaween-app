"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, Polygon, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { config } from "@/lib/config";
import { useMapTiles } from "@/hooks/use-map-tiles";
import { polygonLatLngRings } from "@/lib/gov-neighborhoods/parse";
import type { EventBoundaryKind } from "@/lib/event-boundary";

const KIND_COLORS: Record<EventBoundaryKind, string> = {
  city: "#38bdf8",
  neighborhood: "#34d399",
  street: "#fb923c",
};

function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (!bounds) return;
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 16 });
  }, [bounds, map]);
  return null;
}

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

import type { EventBoundaryMapFeature } from "@/components/event-creator-map-types";

type Props = {
  features: EventBoundaryMapFeature[];
  selectedIds: string[];
};

export function EventCreatorMap({ features, selectedIds }: Props) {
  const { tiles } = useMapTiles();
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const bounds = useMemo(() => {
    if (features.length === 0) return null;
    const b = L.latLngBounds([]);
    for (const f of features) {
      const rings =
        f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"
          ? ringsFromGeometry(f.geometry)
          : polygonLatLngRings(f as Parameters<typeof polygonLatLngRings>[0]);
      for (const ring of rings) {
        for (const [lat, lng] of ring) b.extend([lat, lng]);
      }
    }
    return b.isValid() ? b : null;
  }, [features]);

  return (
    <div className="h-[min(52vh,420px)] w-full overflow-hidden rounded-xl border border-white/10">
      <MapContainer
        center={[config.map.center.lat, config.map.center.lng]}
        zoom={config.map.zoom}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution={tiles.attribution}
          url={tiles.url}
          subdomains={tiles.subdomains}
          maxNativeZoom={tiles.maxNativeZoom}
        />
        <FitBounds bounds={bounds} />
        {features.map((feature, idx) => {
          const id = feature.properties?.id ?? String(idx);
          const isOn = selected.has(id);
          const kind = feature.properties?.kind ?? "neighborhood";
          const color = KIND_COLORS[kind];
          const label = feature.properties?.label ?? id;
          const rings = ringsFromGeometry(feature.geometry);
          return rings.map((positions, ringIdx) => (
            <Polygon
              key={`${id}-${ringIdx}`}
              positions={positions}
              pathOptions={{
                color: isOn ? color : "#94a3b8",
                weight: kind === "street" ? 2 : isOn ? 2.5 : 1.5,
                opacity: isOn ? 0.9 : 0.45,
                fillColor: color,
                fillOpacity: kind === "city" ? 0.06 : kind === "street" ? 0.14 : 0.12,
                dashArray: isOn ? (kind === "city" ? "8 4" : undefined) : "4 6",
              }}
            >
              <Tooltip sticky direction="top">
                {label}
                {kind === "city" ? " · עיר" : kind === "street" ? " · רחוב" : " · שכונה"}
                {isOn ? " · נבחר" : ""}
              </Tooltip>
            </Polygon>
          ));
        })}
      </MapContainer>
    </div>
  );
}
