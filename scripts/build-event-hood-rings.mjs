#!/usr/bin/env node
/**
 * Extract GovMap polygons for HallowHood's four event neighborhoods.
 * Output: src/lib/event-neighborhood-gov-rings.json (committed; rebuild when geo updates).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";

const root = process.cwd();
const dataDir = join(root, "public/data");
const outPath = join(root, "src/lib/event-neighborhood-gov-rings.json");

const CANDIDATES = ["geojson", "geojson.gz", "gov-neighborhoods.geojson.gz", "gov-neighborhoods.geojson"];

const TARGETS = [
  { id: "הגפן", city: "רמת גן", matchNames: ["גפן", "הגפן"] },
  { id: "חרוזים", city: "רמת גן", matchNames: ["חרוזים"] },
  { id: "נחלת גנים", city: "רמת גן", matchNames: ["נחלת גנים"] },
  { id: "שיכון ותיקים", city: "רמת גן", matchNames: ["שיכון ותיקים"] },
];

const NAME_KEYS = ["fname", "שם_שכונה", "shem_shchu", "name"];
const CITY_KEYS = ["setl_name", "SETL_NAME", "ישוב", "yishuv", "city"];

function resolveDataPath() {
  for (const name of CANDIDATES) {
    const p = join(dataDir, name);
    if (existsSync(p)) return p;
  }
  return null;
}

function readGeoJson(path) {
  const raw = readFileSync(path);
  const isGz = raw.length >= 2 && raw[0] === 0x1f && raw[1] === 0x8b;
  const text = isGz ? gunzipSync(raw).toString("utf8") : raw.toString("utf8");
  return JSON.parse(text);
}

function pick(props, keys) {
  for (const key of keys) {
    const v = props[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function ringSignedArea(ring) {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

/** GeoJSON outer rings only, [lng,lat], closed. */
function normalizeGeometry(geometry) {
  if (geometry.type === "Polygon") {
    const ring = geometry.coordinates[0];
    return ring?.length ? [ring] : [];
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.map((poly) => poly[0]).filter((r) => r?.length);
  }
  return [];
}

function findFeature(features, target) {
  for (const feature of features) {
    const props = feature.properties ?? {};
    const name = pick(props, NAME_KEYS);
    const city = pick(props, CITY_KEYS);
    if (city !== target.city) continue;
    if (!target.matchNames.includes(name)) continue;
    return feature;
  }
  return null;
}

const dataPath = resolveDataPath();
if (!dataPath) {
  console.error("Missing public/data/geojson — skip build, keep existing rings JSON.");
  process.exit(0);
}

const fc = readGeoJson(dataPath);
const features = fc.features ?? [];
const hoods = {};

for (const target of TARGETS) {
  const feature = findFeature(features, target);
  if (!feature?.geometry) {
    console.error("Missing Gov feature for", target.id);
    process.exit(1);
  }
  const rings = normalizeGeometry(feature.geometry);
  if (!rings.length) {
    console.error("No rings for", target.id);
    process.exit(1);
  }
  hoods[target.id] = {
    source: "govmap-shchunot",
    govName: pick(feature.properties ?? {}, NAME_KEYS),
    rings,
  };
}

const payload = {
  version: 1,
  generatedAt: new Date().toISOString(),
  dataFile: dataPath.replace(`${root}/`, ""),
  hoods,
};

writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log("Wrote", outPath, Object.keys(hoods));
