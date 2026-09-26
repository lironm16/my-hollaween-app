#!/usr/bin/env node
/**
 * Snap each catalog house to the nearest OSM walkable point (OSRM foot graph).
 * Writes public/gem-osm-anchors.json — loaded by the app for gem placement.
 *
 *   node scripts/build-gem-osm-anchors.mjs
 *   SKIP_GEM_OSM_ANCHORS=1   — skip (keep existing file)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = join(root, "public/catalog.json");
const outPath = join(root, "public/gem-osm-anchors.json");

const OSRM_NEAREST = [
  "https://routing.openstreetmap.de/routed-foot/nearest/v1/foot",
  "https://router.project-osrm.org/nearest/v1/foot",
];
const UA = "bashchona-halloween/1.0 (gem sidewalk snap)";
const MAX_PIN_DISTANCE_M = 95;
const REQUEST_GAP_MS = 120;

function haversineM(a, b) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function osrmNearest(house) {
  const qs = `?number=1`;
  for (const base of OSRM_NEAREST) {
    const url = `${base}/${house.lng.toFixed(6)},${house.lat.toFixed(6)}${qs}`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) continue;
      const json = await res.json();
      if (json.code !== "Ok" || !json.waypoints?.[0]) continue;
      const wp = json.waypoints[0];
      const lng = wp.location[0];
      const lat = wp.location[1];
      const distanceM = haversineM(house, { lat, lng });
      if (distanceM > MAX_PIN_DISTANCE_M) continue;
      return { lat, lng, distanceM, source: "osrm" };
    } catch {
      /* try next endpoint */
    }
  }
  return null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (process.env.SKIP_GEM_OSM_ANCHORS === "1") {
    console.log("SKIP_GEM_OSM_ANCHORS=1 — leaving gem-osm-anchors.json unchanged");
    return;
  }

  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  const houses = catalog.houses ?? [];
  if (!houses.length) {
    console.warn("No houses in catalog — writing empty gem-osm-anchors.json");
  }

  const anchors = {};
  let ok = 0;
  let miss = 0;

  for (let i = 0; i < houses.length; i += 1) {
    const house = houses[i];
    if (!house?.id || !Number.isFinite(house.lat) || !Number.isFinite(house.lng)) continue;
    const snap = await osrmNearest(house);
    if (snap) {
      anchors[house.id] = snap;
      ok += 1;
    } else {
      miss += 1;
    }
    if (i < houses.length - 1) await sleep(REQUEST_GAP_MS);
  }

  const out = {
    version: 1,
    generatedAt: new Date().toISOString(),
    anchors,
  };
  writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  console.log(`wrote ${outPath} — ${ok} snapped, ${miss} fallback to street spines (${houses.length} houses)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
