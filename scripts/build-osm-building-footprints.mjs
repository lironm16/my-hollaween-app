#!/usr/bin/env node
/**
 * Fill public/osm-building-footprints.json from catalog addresses + Nominatim building geometry.
 *
 *   node scripts/build-osm-building-footprints.mjs
 *   CATALOG_JSON=/path/to/catalog.json node scripts/build-osm-building-footprints.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = process.env.CATALOG_JSON?.trim() || join(root, "data/gem-live-catalog.json");
const outPath = join(root, "public/osm-building-footprints.json");

const UA = "bashchona-halloween/1.0 (osm building footprints)";
const MIN_GAP_MS = 1100;

function parseStreetAndNumber(query) {
  const q = query.split(",")[0]?.trim() ?? query;
  const end = q.match(/^(.+?)\s+(\d+[א-תA-Za-z]?(?:[/-]\d+)?)$/u);
  if (end && end[1].replace(/\d/g, "").trim().length >= 2) {
    return { road: end[1].trim(), num: end[2] };
  }
  return { road: q };
}

function clusterKey(address) {
  const parsed = parseStreetAndNumber(address);
  const road = parsed.road.replace(/^רחוב\s+/u, "").trim().toLowerCase();
  const num = parsed.num?.replace(/^0+/, "").trim().toLowerCase();
  if (road && num) return `${road}#${num}`;
  return null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let lastCall = 0;
async function nominatimSearch(road, num) {
  const wait = Math.max(0, MIN_GAP_MS - (Date.now() - lastCall));
  if (wait) await sleep(wait);
  const q = `${num} ${road} רמת גן`;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", q);
  url.searchParams.set("countrycodes", "il");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  lastCall = Date.now();
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) return null;
  const rows = await res.json();
  if (!Array.isArray(rows)) return null;
  const building = rows.find(
    (row) =>
      row.addresstype === "building" &&
      String(row.address?.house_number ?? "") === String(num) &&
      (row.address?.road || "").includes(road),
  );
  if (!building) return null;
  const lat = Number(building.lat);
  const lng = Number(building.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

async function main() {
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  let existing = { version: 1, generatedAt: "", footprints: {} };
  try {
    existing = JSON.parse(readFileSync(outPath, "utf8"));
  } catch {
    /* fresh */
  }

  const keys = new Map();
  for (const house of catalog.houses ?? []) {
    const key = clusterKey(house.address ?? "");
    if (!key) continue;
    keys.set(key, house.address);
  }

  const footprints = { ...(existing.footprints ?? {}) };
  let added = 0;
  for (const [key, address] of keys) {
    if (footprints[key]) continue;
    const parsed = parseStreetAndNumber(address);
    if (!parsed.num) continue;
    const hit = await nominatimSearch(parsed.road, parsed.num);
    if (hit) {
      footprints[key] = hit;
      added += 1;
      console.log("footprint", key, hit.lat, hit.lng);
    } else {
      console.warn("no OSM building for", key, address);
    }
  }

  const out = {
    version: 1,
    generatedAt: new Date().toISOString(),
    footprints,
  };
  writeFileSync(outPath, `${JSON.stringify(out)}\n`);
  console.log(`wrote ${outPath} (${Object.keys(footprints).length} footprints, +${added} new)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
