"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, Polygon, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { config } from "@/lib/config";
import { useMapTiles } from "@/hooks/use-map-tiles";
import { polygonLatLngRings } from "@/lib/gov-neighborhoods/parse";
import type { EventBoundaryKind } from "@/lib/event-boundary";
import type { EventBoundaryMapFeature } from "@/components/event-creator-map-types";

const KIND_COLORS: Record<EventBoundaryKind, string> = {
  city: "#38bdf8",
  neighborhood: "#34d399",
  street: "#fb923c",
};

function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (!bounds) return;
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
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

type Props = {
  features: EventBoundaryMapFeature[];
  selectedIds: string[];
  /** Features shown muted but tappable (search results not yet selected). */
  previewIds?: string[];
  onFeatureClick?: (featureId: string) => void;
  className?: string;
};

export function EventCreatorMap({
  features,
  selectedIds,
  previewIds = [],
  onFeatureClick,
  className,
}: Props) {
  const { tiles } = useMapTiles();
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const preview = useMemo(() => new Set(previewIds), [previewIds]);

  const bounds = useMemo(() => {
    if (features.length === 0) return null;
    const b = L.latLngBounds([]);
    for (const f of features) {
      const id = f.properties?.id ?? "";
      const isRelevant = selected.has(id) || preview.has(id);
      if (!isRelevant && features.length > 8) continue;
      const rings =
        f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"
          ? ringsFromGeometry(f.geometry)
          : polygonLatLngRings(f as Parameters<typeof polygonLatLngRings>[0]);
      for (const ring of rings) {
        for (const [lat, lng] of ring) b.extend([lat, lng]);
      }
    }
    if (!b.isValid()) {
      for (const f of features) {
        const rings = ringsFromGeometry(f.geometry);
        for (const ring of rings) {
          for (const [lat, lng] of ring) b.extend([lat, lng]);
        }
      }
    }
    return b.isValid() ? b : null;
  }, [features, selected, preview]);

  return (
    <div className={className ?? "h-full w-full"}>
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
          const isPreview = !isOn && preview.has(id);
          const kind = feature.properties?.kind ?? "neighborhood";
          const color = KIND_COLORS[kind];
          const label = feature.properties?.label ?? id;
          const rings = ringsFromGeometry(feature.geometry);
          const clickable = isOn || isPreview;
          return rings.map((positions, ringIdx) => (
            <Polygon
              key={`${id}-${ringIdx}`}
              positions={positions}
              pathOptions={{
                color: isOn ? color : isPreview ? "#a78bfa" : "#64748b",
                weight: isOn ? 3 : isPreview ? 2 : 1,
                opacity: isOn ? 1 : isPreview ? 0.75 : 0.35,
                fillColor: isOn ? color : isPreview ? "#c4b5fd" : "#64748b",
                fillOpacity: isOn
                  ? kind === "city"
                    ? 0.12
                    : kind === "street"
                      ? 0.22
                      : 0.28
                  : isPreview
                    ? 0.14
                    : 0.04,
                dashArray: kind === "city" && isOn ? "8 4" : undefined,
              }}
              eventHandlers={
                clickable && onFeatureClick
                  ? {
                      click: () => onFeatureClick(id),
                    }
                  : undefined
              }
            >
              <Tooltip sticky direction="top">
                {label}
                {isOn ? " · נבחר" : isPreview ? " · לחץ לבחירה" : ""}
              </Tooltip>
            </Polygon>
          ));
        })}
      </MapContainer>
    </div>
  );
}
