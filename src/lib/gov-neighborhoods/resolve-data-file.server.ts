import { existsSync, readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";

const DATA_DIR = join(process.cwd(), "public/data");

/** Local GovMap layer — first match wins. */
export const GOV_NEIGHBORHOOD_DATA_CANDIDATES = [
  "gov-neighborhoods.geojson.gz",
  "geojson.gz",
  "geojson",
  "gov-neighborhoods.geojson",
] as const;

export function resolveGovNeighborhoodDataPath(): string | null {
  for (const name of GOV_NEIGHBORHOOD_DATA_CANDIDATES) {
    const path = join(DATA_DIR, name);
    if (existsSync(path)) return path;
  }
  return null;
}

function isGzipBuffer(buf: Buffer): boolean {
  return buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b;
}

/** Read FeatureCollection JSON from resolved path (plain or gzip). */
export function readGovNeighborhoodGeoJsonFile(): { path: string; json: unknown } {
  const path = resolveGovNeighborhoodDataPath();
  if (!path) {
    throw new Error("missing_gov_neighborhoods_data");
  }
  const raw = readFileSync(path);
  const text = isGzipBuffer(raw) ? gunzipSync(raw).toString("utf8") : raw.toString("utf8");
  return { path, json: JSON.parse(text) };
}
