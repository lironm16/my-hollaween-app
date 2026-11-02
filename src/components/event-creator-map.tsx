"use client";

import { Fragment, useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, Polygon, TileLayer, useMap, useMapEvents } from "react-leaflet";
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
  point: "#a78bfa",
};

const KIND_DRAW_ORDER: Record<EventBoundaryKind, number> = {
  city: 0,
  neighborhood: 1,
  street: 2,
  point: 3,
};

export const EVENT_CREATOR_ISRAEL_BOUNDS: L.LatLngBoundsExpression = [
  [29.48, 34.17],
  [33.35, 35.92],
];

const ISRAEL_CENTER: [number, number] = [31.35, 35.1];

const EVENT_POINT_PIN_ICON = L.divIcon({
  className: "event-creator-point-pin",
  html: `<div style="width:26px;height:26px;background:#a78bfa;border:2.5px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 10px rgba(0,0,0,.5)"></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

function PointDraftPin({
  lat,
  lng,
  onMove,
}: {
  lat: number;
  lng: number;
  onMove: (lat: number, lng: number) => void;
}) {
  return (
    <Marker
      position={[lat, lng]}
      draggable
      icon={EVENT_POINT_PIN_ICON}
      zIndexOffset={900}
      eventHandlers={{
        dragend: (e) => {
          const ll = e.target.getLatLng();
          onMove(ll.lat, ll.lng);
        },
      }}
    />
  );
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

function MapBackgroundTap({ onTap }: { onTap?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onTap?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FitBounds({
  bounds,
  showCountry,
  fitKey,
}: {
  bounds: L.LatLngBoundsExpression | null;
  showCountry: boolean;
  /** Changes when selected zone set changes — avoids over-wide refits on minor geometry updates. */
  fitKey: string;
}) {
  const map = useMap();
  const lastFitKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const token = showCountry ? `country:${fitKey}` : `zones:${fitKey}`;
    if (!showCountry && !bounds) return;
    if (lastFitKeyRef.current === token) return;
    lastFitKeyRef.current = token;

    if (showCountry) {
      map.fitBounds(EVENT_CREATOR_ISRAEL_BOUNDS, { padding: [20, 20], maxZoom: 8 });
      return;
    }
    map.fitBounds(bounds!, {
      paddingTopLeft: [12, 12],
      paddingBottomRight: [12, 88],
      maxZoom: 18,
    });
  }, [bounds, showCountry, fitKey, map]);
  return null;
}

type Props = {
  features: EventBoundaryMapFeature[];
  selectedIds: string[];
  focusedId?: string | null;
  boundsFitKey?: string;
  onAreaClick?: (featureId: string) => void;
  /** Tap on map outside selected polygons — e.g. add שכונה at point. */
  onBackgroundTap?: (lat: number, lng: number) => void;
  /** Draggable pin while placing a נקודה on the map. */
  pointDraft?: { lat: number; lng: number } | null;
  onPointDraftMove?: (lat: number, lng: number) => void;
  className?: string;
};

export function EventCreatorMap({
  features,
  selectedIds,
  focusedId = null,
  boundsFitKey = "",
  onAreaClick,
  onBackgroundTap,
  pointDraft = null,
  onPointDraftMove,
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
        <FitBounds bounds={bounds} showCountry={showCountry} fitKey={boundsFitKey} />
        {onBackgroundTap ? <MapBackgroundTap onTap={onBackgroundTap} /> : null}
        {pointDraft && onPointDraftMove ? (
          <PointDraftPin lat={pointDraft.lat} lng={pointDraft.lng} onMove={onPointDraftMove} />
        ) : null}
        {features.map((feature, idx) => {
          if (feature.properties?.kind !== "point") return null;
          const id = feature.properties?.id ?? String(idx);
          if (!selected.has(id)) return null;
          const plat = feature.properties.pointLat;
          const plng = feature.properties.pointLng;
          if (plat == null || plng == null) return null;
          if (pointDraft && plat === pointDraft.lat && plng === pointDraft.lng) return null;
          return <Marker key={`pin-${id}`} position={[plat, plng]} icon={EVENT_POINT_PIN_ICON} zIndexOffset={800} />;
        })}
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
                    fillOpacity:
                      kind === "city" ? 0.12 : kind === "point" ? 0.55 : kind === "street" ? 0.38 : 0.28,
                    dashArray: kind === "city" ? "8 4" : undefined,
                  }}
                  eventHandlers={
                    onAreaClick
                      ? {
                          click: (e) => {
                            L.DomEvent.stopPropagation(e);
                            L.DomEvent.preventDefault(e.originalEvent);
                            onAreaClick(id);
                          },
                        }
                      : undefined
                  }
                  bubblingMouseEvents={false}
                />
              ))}
            </Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
