"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, Polygon, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { config } from "@/lib/config";
import { useMapTiles } from "@/hooks/use-map-tiles";
import { polygonLatLngRings } from "@/lib/gov-neighborhoods/parse";
import type { GovNeighborhoodFeature } from "@/lib/gov-neighborhoods/types";

const HOOD_PALETTE = ["#34d399", "#fb923c", "#a78bfa", "#f472b6", "#fde68a", "#38bdf8", "#f87171"];

function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (!bounds) return;
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 16 });
  }, [bounds, map]);
  return null;
}

type Props = {
  features: GovNeighborhoodFeature[];
  selectedIds: string[];
  idByFeatureIndex: string[];
};

export function EventCreatorMap({ features, selectedIds, idByFeatureIndex }: Props) {
  const { tiles } = useMapTiles();

  const bounds = useMemo(() => {
    if (features.length === 0) return null;
    const b = L.latLngBounds([]);
    for (const f of features) {
      for (const ring of polygonLatLngRings(f)) {
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
          const id = idByFeatureIndex[idx] ?? String(idx);
          const selected = selectedIds.includes(id);
          const color = HOOD_PALETTE[idx % HOOD_PALETTE.length];
          const rings = polygonLatLngRings(feature);
          const name =
            (feature.properties?.shem_shchu as string | undefined) ??
            (feature.properties?.["שם_שכונה"] as string | undefined) ??
            id;
          return rings.map((positions, ringIdx) => (
            <Polygon
              key={`${id}-${ringIdx}`}
              positions={positions}
              pathOptions={{
                color: selected ? color : "#94a3b8",
                weight: selected ? 2.5 : 1.5,
                opacity: selected ? 0.9 : 0.45,
                fillColor: color,
                fillOpacity: selected ? 0.18 : 0.04,
                dashArray: selected ? undefined : "4 6",
              }}
            >
              <Tooltip sticky direction="top">
                {name}
                {selected ? " · נבחר" : ""}
              </Tooltip>
            </Polygon>
          ));
        })}
      </MapContainer>
    </div>
  );
}
