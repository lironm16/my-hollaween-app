#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";

const root = process.cwd();
const dataDir = join(root, "public/data");
const CANDIDATES = [
  "gov-neighborhoods.geojson.gz",
  "geojson.gz",
  "geojson",
  "gov-neighborhoods.geojson",
];
const outPath = join(dataDir, "gov-neighborhood-catalog.json");

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

const NAME_KEYS = ["שם_שכונה", "shem_shchu", "SHEM_SHCHU", "name", "NAME"];
const CITY_KEYS = ["ישוב", "yishuv", "YISHUV", "city", "CITY"];
const ID_KEYS = ["UniqueId", "uniqueId", "OBJECTID", "FID", "fid", "ms_shchuna"];

function pick(props, keys) {
  for (const key of keys) {
    const v = props[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return "";
}

function ringBbox(ring) {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const pt of ring) {
    const [lng, lat] = pt;
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }
  return [minLng, minLat, maxLng, maxLat];
}

function geometryBbox(geometry) {
  if (geometry.type === "Polygon") return ringBbox(geometry.coordinates[0] ?? []);
  if (geometry.type === "MultiPolygon") {
    let bbox = [Infinity, Infinity, -Infinity, -Infinity];
    for (const poly of geometry.coordinates) {
      const part = ringBbox(poly[0] ?? []);
      bbox = [
        Math.min(bbox[0], part[0]),
        Math.min(bbox[1], part[1]),
        Math.max(bbox[2], part[2]),
        Math.max(bbox[3], part[3]),
      ];
    }
    return bbox;
  }
  return null;
}

const dataPath = resolveDataPath();
if (!dataPath) {
  console.error(`Missing GovMap layer in ${dataDir}/`);
  console.error(`Expected one of: ${CANDIDATES.join(", ")}`);
  console.error("Download from public/data/README.md and retry.");
  process.exit(1);
}

console.log(`Reading ${dataPath}`);
const fc = readGeoJson(dataPath);
if (fc.type !== "FeatureCollection") {
  console.error("Expected FeatureCollection");
  process.exit(1);
}

const entries = [];
for (const feature of fc.features) {
  const props = feature.properties ?? {};
  const name = pick(props, NAME_KEYS);
  if (!name) continue;
  const city = pick(props, CITY_KEYS);
  const explicit = pick(props, ID_KEYS);
  const id = explicit && city ? `${city}|${explicit}` : explicit ? explicit : `${city || "unknown"}|${name}`;
  const bbox = geometryBbox(feature.geometry);
  if (!bbox) continue;
  entries.push({
    id,
    name,
    city,
    bbox,
    center: [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2],
  });
}

entries.sort((a, b) => a.city.localeCompare(b.city, "he") || a.name.localeCompare(b.name, "he"));

const catalog = {
  version: 1,
  source: "govmap-shchunot",
  generatedAt: new Date().toISOString(),
  featureCount: entries.length,
  entries,
};

writeFileSync(outPath, JSON.stringify(catalog));
console.log(`Wrote ${entries.length} entries → ${outPath}`);
