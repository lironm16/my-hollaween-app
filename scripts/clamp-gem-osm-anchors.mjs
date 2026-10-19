#!/usr/bin/env node
/**
 * Clamp every entry in public/gem-osm-anchors.json to GEM_ANCHOR_PLACE_MAX_METERS from the house pin.
 *
 *   node --import tsx scripts/clamp-gem-osm-anchors.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { clampGemAnchorPlacement, GEM_ANCHOR_PLACE_MAX_METERS } from "../src/lib/gem-anchor-placement.ts";
import { bearingDegrees, distanceMeters } from "../src/lib/geo.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = join(root, "public/catalog.json");
const osmPath = join(root, "public/gem-osm-anchors.json");

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const byId = new Map((catalog.houses ?? []).map((h) => [h.id, h]));
const file = JSON.parse(readFileSync(osmPath, "utf8"));
let clamped = 0;

for (const [houseId, entry] of Object.entries(file.anchors ?? {})) {
  const house = byId.get(houseId);
  if (!house) continue;
  const before = { lat: entry.lat, lng: entry.lng };
  const after = clampGemAnchorPlacement(house, before);
  const dBefore = distanceMeters(house, before);
  if (dBefore <= GEM_ANCHOR_PLACE_MAX_METERS + 0.05) continue;
  entry.lat = after.lat;
  entry.lng = after.lng;
  entry.distanceM = distanceMeters(house, after);
  entry.pinLat = house.lat;
  entry.pinLng = house.lng;
  clamped += 1;
}

writeFileSync(osmPath, `${JSON.stringify(file, null, 2)}\n`, "utf8");
console.log(`Clamped ${clamped} OSM anchor(s) to ${GEM_ANCHOR_PLACE_MAX_METERS}m.`);
