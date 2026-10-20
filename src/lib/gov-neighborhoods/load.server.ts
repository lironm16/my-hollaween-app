import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  readGovNeighborhoodGeoJsonFile,
  resolveGovNeighborhoodDataPath,
} from "@/lib/gov-neighborhoods/resolve-data-file.server";
import {
  catalogEntryFromFeature,
  govNeighborhoodCity,
  govNeighborhoodName,
  govNeighborhoodStableId,
} from "@/lib/gov-neighborhoods/parse";
import type {
  GovNeighborhoodCatalog,
  GovNeighborhoodCatalogEntry,
  GovNeighborhoodFeature,
} from "@/lib/gov-neighborhoods/types";

const CATALOG_PATH = join(process.cwd(), "public/data/gov-neighborhood-catalog.json");

type Collection = GeoJSON.FeatureCollection<GovNeighborhoodFeature["geometry"]>;

let cachedCollection: Collection | null = null;
let cachedCatalog: GovNeighborhoodCatalog | null = null;
let cachedById: Map<string, GovNeighborhoodFeature> | null = null;

export function govNeighborhoodDataPath(): string | null {
  return resolveGovNeighborhoodDataPath();
}

export function govNeighborhoodDataAvailable(): boolean {
  return resolveGovNeighborhoodDataPath() !== null;
}

function readGzGeoJson(): Collection {
  if (cachedCollection) return cachedCollection;
  const { json: parsedRaw } = readGovNeighborhoodGeoJsonFile();
  const parsed = parsedRaw as Collection;
  if (parsed.type !== "FeatureCollection" || !Array.isArray(parsed.features)) {
    throw new Error("invalid_gov_neighborhoods_geojson");
  }
  cachedCollection = parsed;
  return parsed;
}

function indexFeatures(features: GovNeighborhoodFeature[]): Map<string, GovNeighborhoodFeature> {
  const map = new Map<string, GovNeighborhoodFeature>();
  for (const feature of features) {
    const props = feature.properties ?? {};
    const name = govNeighborhoodName(props);
    if (!name) continue;
    const city = govNeighborhoodCity(props);
    const id = govNeighborhoodStableId(props, name, city);
    map.set(id, feature);
  }
  return map;
}

export function loadGovNeighborhoodById(id: string): GovNeighborhoodFeature | null {
  if (!cachedById) {
    const fc = readGzGeoJson();
    cachedById = indexFeatures(fc.features as GovNeighborhoodFeature[]);
  }
  return cachedById.get(id) ?? null;
}

export function loadGovNeighborhoodCatalogFromDisk(): GovNeighborhoodCatalog | null {
  if (cachedCatalog) return cachedCatalog;
  if (!existsSync(CATALOG_PATH)) return null;
  try {
    cachedCatalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8")) as GovNeighborhoodCatalog;
    return cachedCatalog;
  } catch {
    return null;
  }
}

export function buildGovNeighborhoodCatalog(): GovNeighborhoodCatalog {
  const fc = readGzGeoJson();
  const entries: GovNeighborhoodCatalogEntry[] = [];
  for (const feature of fc.features as GovNeighborhoodFeature[]) {
    const entry = catalogEntryFromFeature(feature);
    if (entry) entries.push(entry);
  }
  entries.sort((a, b) => a.city.localeCompare(b.city, "he") || a.name.localeCompare(b.name, "he"));
  return {
    version: 1,
    source: "govmap-shchunot",
    generatedAt: new Date().toISOString(),
    featureCount: entries.length,
    entries,
  };
}

export function catalogFingerprint(catalog: GovNeighborhoodCatalog): string {
  return createHash("sha256").update(JSON.stringify(catalog.entries.map((e) => e.id))).digest("hex").slice(0, 12);
}

export function uniqueCitiesFromCatalog(catalog: GovNeighborhoodCatalog, q?: string, limit = 80): string[] {
  const set = new Set<string>();
  for (const e of catalog.entries) {
    if (e.city?.trim()) set.add(e.city.trim());
  }
  let cities = [...set].sort((a, b) => a.localeCompare(b, "he"));
  const needle = q?.trim();
  if (needle) {
    const n = needle.toLowerCase();
    cities = cities.filter((c) => c.includes(needle) || c.toLowerCase().includes(n));
  }
  return cities.slice(0, limit);
}

export function searchCatalog(
  catalog: GovNeighborhoodCatalog,
  opts: { city?: string; q?: string; limit?: number },
): GovNeighborhoodCatalogEntry[] {
  const limit = Math.min(Math.max(opts.limit ?? 80, 1), 500);
  const cityNeedle = opts.city?.trim();
  const q = opts.q?.trim().toLowerCase();
  let list = catalog.entries;
  if (cityNeedle) {
    const c = cityNeedle.toLowerCase();
    list = list.filter(
      (e) => e.city.includes(cityNeedle) || e.city.toLowerCase().includes(c) || cityNeedle.includes(e.city),
    );
  }
  if (q) {
    list = list.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.city.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q),
    );
  }
  return list.slice(0, limit);
}
