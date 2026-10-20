export type GovNeighborhoodCatalogEntry = {
  /** Stable id for API + event drafts (city|name or UniqueId). */
  id: string;
  name: string;
  city: string;
  bbox: [number, number, number, number];
  center: [number, number];
};

export type GovNeighborhoodCatalog = {
  version: number;
  source: "govmap-shchunot";
  generatedAt: string;
  featureCount: number;
  entries: GovNeighborhoodCatalogEntry[];
};

export type GovNeighborhoodFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  Record<string, unknown>
>;
