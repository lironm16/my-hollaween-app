import Supercluster from "supercluster";
import type { HouseCluster } from "@/lib/house-clusters";

/**
 * Browse-mode map density clustering (supercluster). Set to `false` to revert
 * to showing every building pin at all zoom levels (keep route-mode bypass as-is).
 */
export const MAP_GEO_CLUSTER_BROWSE_ENABLED = true;

/** Supercluster stops merging above this zoom — pins match address clusters. */
export const MAP_GEO_CLUSTER_MAX_ZOOM = 17;

const GEO_CLUSTER_RADIUS_PX = 58;
const GEO_CLUSTER_MIN_POINTS = 2;

export type AddressClusterFeatureProps = {
  kind: "address";
  clusterKey: string;
};

export type MapGeoClusterBBox = [west: number, south: number, east: number, north: number];

export function buildAddressClusterGeoIndex(clusters: readonly HouseCluster[]) {
  const index = new Supercluster<AddressClusterFeatureProps>({
    radius: GEO_CLUSTER_RADIUS_PX,
    maxZoom: MAP_GEO_CLUSTER_MAX_ZOOM,
    minPoints: GEO_CLUSTER_MIN_POINTS,
  });
  const features = clusters.map((cluster) => ({
    type: "Feature" as const,
    properties: {
      kind: "address" as const,
      clusterKey: cluster.key,
    },
    geometry: {
      type: "Point" as const,
      coordinates: [cluster.lng, cluster.lat] as [number, number],
    },
  }));
  index.load(features);
  return index;
}

export function latLngBoundsToGeoBBox(bounds: {
  getWest(): number;
  getSouth(): number;
  getEast(): number;
  getNorth(): number;
}): MapGeoClusterBBox {
  return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
}

/** Integer zoom Leaflet reports (supercluster expects floored zoom). */
export function mapZoomForGeoCluster(zoom: number) {
  return Math.floor(zoom);
}

export function geoClustersInView(
  index: Supercluster<AddressClusterFeatureProps>,
  bbox: MapGeoClusterBBox,
  zoom: number,
) {
  return index.getClusters(bbox, mapZoomForGeoCluster(zoom));
}

export function geoClusterExpansionZoom(
  index: Supercluster<AddressClusterFeatureProps>,
  clusterId: number,
  mapMaxZoom: number,
) {
  return Math.min(index.getClusterExpansionZoom(clusterId), mapMaxZoom);
}

export function isGeoClusterFeature(
  feature: Supercluster.ClusterFeature<Supercluster.AnyProps> | Supercluster.PointFeature<AddressClusterFeatureProps>,
): feature is Supercluster.ClusterFeature<Supercluster.AnyProps> {
  return "cluster" in feature.properties && feature.properties.cluster === true;
}

export function addressClusterKeyFromFeature(
  feature: Supercluster.PointFeature<AddressClusterFeatureProps>,
): string | null {
  if (feature.properties.kind !== "address") return null;
  return feature.properties.clusterKey;
}
