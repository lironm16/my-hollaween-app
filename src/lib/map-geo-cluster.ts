import type { Feature, Point } from "geojson";
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

export type GeoAggregateClusterProperties = {
  cluster: true;
  cluster_id: number;
  point_count: number;
  point_count_abbreviated?: string | number;
};

export type AddressClusterPointFeature = Feature<Point, AddressClusterFeatureProps>;
export type GeoAggregateClusterFeature = Feature<Point, GeoAggregateClusterProperties>;
export type GeoClusterViewFeature = AddressClusterPointFeature | GeoAggregateClusterFeature;

export type AddressClusterGeoIndex = Supercluster<AddressClusterFeatureProps>;

export type MapGeoClusterBBox = [west: number, south: number, east: number, north: number];

export function buildAddressClusterGeoIndex(clusters: readonly HouseCluster[]): AddressClusterGeoIndex {
  const index = new Supercluster<AddressClusterFeatureProps>({
    radius: GEO_CLUSTER_RADIUS_PX,
    maxZoom: MAP_GEO_CLUSTER_MAX_ZOOM,
    minPoints: GEO_CLUSTER_MIN_POINTS,
  });
  const features: AddressClusterPointFeature[] = clusters.map((cluster) => ({
    type: "Feature",
    properties: {
      kind: "address",
      clusterKey: cluster.key,
    },
    geometry: {
      type: "Point",
      coordinates: [cluster.lng, cluster.lat],
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
  index: AddressClusterGeoIndex,
  bbox: MapGeoClusterBBox,
  zoom: number,
): GeoClusterViewFeature[] {
  return index.getClusters(bbox, mapZoomForGeoCluster(zoom)) as GeoClusterViewFeature[];
}

export function geoClusterExpansionZoom(
  index: AddressClusterGeoIndex,
  clusterId: number,
  mapMaxZoom: number,
) {
  return Math.min(index.getClusterExpansionZoom(clusterId), mapMaxZoom);
}

export function isGeoClusterFeature(feature: GeoClusterViewFeature): feature is GeoAggregateClusterFeature {
  const props = feature.properties;
  return props != null && "cluster" in props && props.cluster === true;
}

export function addressClusterKeyFromFeature(feature: AddressClusterPointFeature): string {
  return feature.properties.clusterKey;
}
