"use client";

import { Fragment, useEffect, useMemo } from "react";
import { MapContainer, Marker, Polygon, TileLayer, Tooltip, useMap } from "react-leaflet";
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

/** Whole-country frame for empty event-creator map. */
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

function centroidFromRings(rings: [number, number][][]): [number, number] | null {
  const ring = rings[0];
  if (!ring?.length) return null;
  let lat = 0;
  let lng = 0;
  for (const [la, ln] of ring) {
    lat += la;
    lng += ln;
  }
  return [lat / ring.length, lng / ring.length];
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

function removeMarkerIcon() {
  return L.divIcon({
    className: "event-boundary-remove-marker",
    html: `<button type="button" aria-label="הסר" style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;border:2px solid rgba(255,255,255,0.9);background:rgba(127,29,29,0.92);color:white;font-size:18px;line-height:1;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,0.45);cursor:pointer;">−</button>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

type Props = {
  features: EventBoundaryMapFeature[];
  selectedIds: string[];
  onRemove?: (featureId: string) => void;
  className?: string;
};

export function EventCreatorMap({ features, selectedIds, onRemove, className }: Props) {
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

  const removeIcon = useMemo(() => removeMarkerIcon(), []);

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
        <FitBounds bounds={bounds} showCountry={showCountry} />
        {features.map((feature, idx) => {
          const id = feature.properties?.id ?? String(idx);
          if (!selected.has(id)) return null;
          const kind = feature.properties?.kind ?? "neighborhood";
          const color = KIND_COLORS[kind];
          const label = feature.properties?.label ?? id;
          const rings = ringsFromGeometry(feature.geometry);
          const centroid = centroidFromRings(rings);
          return (
            <Fragment key={id}>
              {rings.map((positions, ringIdx) => (
                <Polygon
                  key={`${id}-${ringIdx}`}
                  positions={positions}
                  pathOptions={{
                    color,
                    weight: 3,
                    opacity: 1,
                    fillColor: color,
                    fillOpacity: kind === "city" ? 0.12 : kind === "street" ? 0.26 : 0.32,
                    dashArray: kind === "city" ? "8 4" : undefined,
                  }}
                >
                  <Tooltip sticky direction="top">
                    {label} · {kind === "city" ? "עיר" : kind === "street" ? "רחוב" : "שכונה"}
                  </Tooltip>
                </Polygon>
              ))}
              {centroid && onRemove ? (
                <Marker
                  position={centroid}
                  icon={removeIcon}
                  zIndexOffset={1000}
                  eventHandlers={{
                    click: (e) => {
                      L.DomEvent.stopPropagation(e.originalEvent);
                      onRemove(id);
                    },
                  }}
                />
              ) : null}
            </Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
