#!/usr/bin/env node
/**
 * Snap gem-eligible *real* houses from a catalog JSON (production-shaped).
 * Merges into public/gem-osm-anchors.json so deploys ship sidewalk pins without Vercel→OSRM.
 *
 *   node scripts/build-gem-osm-anchors-live.mjs
 *   CATALOG_JSON=/path/to/catalog.json node scripts/build-gem-osm-anchors-live.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = process.env.CATALOG_JSON?.trim() || join(root, "data/gem-live-catalog.json");
const outPath = join(root, "public/gem-osm-anchors.json");

const STUB_ID = /^(?:בית|נק)-931\d$/;
function isStubHouse(house) {
  if (house.id && STUB_ID.test(house.id)) return true;
  return Boolean(house.description?.includes("סטאב לחזרה"));
}

const OSRM_NEAREST = [
  "https://routing.openstreetmap.de/routed-foot/nearest/v1/foot",
  "https://router.project-osrm.org/nearest/v1/foot",
];
const UA = "bashchona-halloween/1.0 (gem sidewalk snap)";
const MAX_PIN_DISTANCE_M = 120;
const REQUEST_GAP_MS = 100;

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
  for (const base of OSRM_NEAREST) {
    const url = `${base}/${house.lng.toFixed(6)},${house.lat.toFixed(6)}?number=1`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) continue;
      const json = await res.json();
      if (json.code !== "Ok" || !json.waypoints?.[0]) continue;
      const wp = json.waypoints[0];
      const lng = wp.location[0];
      const lat = wp.location[1];
      const distanceM = haversineM(house, { lat, lng });
      if (distanceM > MAX_PIN_DISTANCE_M) continue;
      return { lat, lng, distanceM, source: "osrm", pinLat: house.lat, pinLng: house.lng };
    } catch {
      /* next */
    }
  }
  return null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  const houses = (catalog.houses ?? []).filter(
    (h) => h?.id && !isStubHouse(h) && Number.isFinite(h.lat) && Number.isFinite(h.lng),
  );

  let existing = { version: 1, generatedAt: "", anchors: {} };
  try {
    existing = JSON.parse(readFileSync(outPath, "utf8"));
  } catch {
    /* fresh */
  }

  const anchors = { ...(existing.anchors ?? {}) };
  let ok = 0;
  let miss = 0;

  for (let i = 0; i < houses.length; i += 1) {
    const house = houses[i];
    const snap = await osrmNearest(house);
    if (snap) {
      anchors[house.id] = snap;
      ok += 1;
    } else {
      miss += 1;
      console.warn("no osrm snap:", house.id, house.address);
    }
    if (i < houses.length - 1) await sleep(REQUEST_GAP_MS);
  }

  const out = {
    version: 1,
    generatedAt: new Date().toISOString(),
    anchors,
  };
  writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  console.log(
    `wrote ${outPath} — ${ok} snapped this run, ${miss} miss, ${Object.keys(anchors).length} total anchor ids (${houses.length} real houses)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
