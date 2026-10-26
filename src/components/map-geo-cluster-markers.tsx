"use client";

import { Fragment, memo, useCallback, useEffect, useMemo, useState } from "react";
import { Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { HouseCluster } from "@/lib/house-clusters";
import {
  MAP_GEO_CLUSTER_BROWSE_ENABLED,
  addressClusterKeyFromFeature,
  buildAddressClusterGeoIndex,
  geoClusterExpansionZoom,
  geoClustersInView,
  isGeoClusterFeature,
  latLngBoundsToGeoBBox,
} from "@/lib/map-geo-cluster";
import { config } from "@/lib/config";

const GEO_BUBBLE_CACHE = new Map<string, L.DivIcon>();

function geoClusterBubbleIcon(count: number) {
  const key = `c:${count}`;
  const hit = GEO_BUBBLE_CACHE.get(key);
  if (hit) return hit;
  const size = Math.min(52, 28 + Math.sqrt(count) * 4);
  const label = count > 999 ? "999+" : String(count);
  const icon = L.divIcon({
    className: "map-geo-cluster-icon",
    html: `<div class="map-geo-cluster-bubble" role="img" aria-label="${count} בתים"><span>${label}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
  GEO_BUBBLE_CACHE.set(key, icon);
  return icon;
}

function MapGeoClusterViewportSync({
  onChange,
}: {
  onChange: (zoom: number, bbox: ReturnType<typeof latLngBoundsToGeoBBox>) => void;
}) {
  const map = useMap();
  const push = useCallback(() => {
    onChange(map.getZoom(), latLngBoundsToGeoBBox(map.getBounds()));
  }, [map, onChange]);

  useMapEvents({
    zoomend: push,
    moveend: push,
  });

  useEffect(() => {
    push();
  }, [push]);

  return null;
}

export type GeoClusterBrowseGate = {
  enabled: boolean;
  /** Route mode — show every stop pin (no geo bubbles). */
  routeModeActive: boolean;
  pickMode?: boolean;
  embed?: boolean;
};

export function mapGeoClusterBrowseActive(gate: GeoClusterBrowseGate) {
  return (
    MAP_GEO_CLUSTER_BROWSE_ENABLED &&
    gate.enabled &&
    !gate.routeModeActive &&
    !gate.pickMode &&
    !gate.embed
  );
}

const GeoClusterBubbleMarker = memo(function GeoClusterBubbleMarker({
  lat,
  lng,
  count,
  clusterId,
  onExpand,
}: {
  lat: number;
  lng: number;
  count: number;
  clusterId: number;
  onExpand: (clusterId: number, lat: number, lng: number) => void;
}) {
  const icon = useMemo(() => geoClusterBubbleIcon(count), [count]);
  const onClick = useCallback(
    (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e.originalEvent);
      onExpand(clusterId, lat, lng);
    },
    [clusterId, lat, lng, onExpand],
  );
  return (
    <Marker
      position={[lat, lng]}
      icon={icon}
      zIndexOffset={900}
      eventHandlers={{ click: onClick }}
    />
  );
});

export function MapGeoClusterMarkers({
  gate,
  addressClusters,
  renderAddressCluster,
}: {
  gate: GeoClusterBrowseGate;
  addressClusters: HouseCluster[];
  renderAddressCluster: (cluster: HouseCluster) => React.ReactNode;
}) {
  const map = useMap();
  const [viewport, setViewport] = useState(() => ({
    zoom: map.getZoom(),
    bbox: latLngBoundsToGeoBBox(map.getBounds()),
  }));

  const onViewport = useCallback((zoom: number, bbox: ReturnType<typeof latLngBoundsToGeoBBox>) => {
    setViewport({ zoom, bbox });
  }, []);

  const index = useMemo(() => buildAddressClusterGeoIndex(addressClusters), [addressClusters]);
  const clusterByKey = useMemo(() => {
    const mapByKey = new Map<string, HouseCluster>();
    for (const c of addressClusters) mapByKey.set(c.key, c);
    return mapByKey;
  }, [addressClusters]);

  const onExpandGeoCluster = useCallback(
    (clusterId: number, lat: number, lng: number) => {
      const z = geoClusterExpansionZoom(index, clusterId, config.map.maxZoom);
      map.setView([lat, lng], z, { animate: true });
    },
    [index, map],
  );

  if (!mapGeoClusterBrowseActive(gate)) {
    return <>{addressClusters.map((cluster) => renderAddressCluster(cluster))}</>;
  }

  const features = geoClustersInView(index, viewport.bbox, viewport.zoom);

  return (
    <>
      <MapGeoClusterViewportSync onChange={onViewport} />
      {features.map((feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        if (isGeoClusterFeature(feature)) {
          const clusterId = feature.properties.cluster_id;
          const count = feature.properties.point_count;
          return (
            <GeoClusterBubbleMarker
              key={`geo-${clusterId}`}
              lat={lat}
              lng={lng}
              count={count}
              clusterId={clusterId}
              onExpand={onExpandGeoCluster}
            />
          );
        }
        const key = addressClusterKeyFromFeature(feature);
        const addressCluster = clusterByKey.get(key);
        if (!addressCluster) return null;
        return <Fragment key={addressCluster.key}>{renderAddressCluster(addressCluster)}</Fragment>;
      })}
    </>
  );
}
