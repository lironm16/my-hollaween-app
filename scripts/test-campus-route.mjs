import { fetchWalkingGeometry, fetchWalkingGeometry as f } from "../src/lib/osrm-walk.ts";
import { buildWalkingRoute } from "../src/lib/route.ts";
import { readFileSync } from "node:fs";

const FARM_RING = [
  { lat: 32.0948, lng: 34.802 },
  { lat: 32.0948, lng: 34.819 },
  { lat: 32.1008, lng: 34.819 },
  { lat: 32.1008, lng: 34.802 },
];

function inFarm(point) {
  return point.lat >= 32.0948 && point.lat <= 32.1008 && point.lng >= 34.802 && point.lng <= 34.819;
}

const m28 = { lat: 32.093459, lng: 34.809422 };
const rashi = { lat: 32.09309, lng: 34.81781 };
const m10 = { lat: 32.0939393, lng: 34.813308 };

for (const [name, a, b] of [
  ["m28->rashi", m28, rashi],
  ["m28->m10", m28, m10],
  ["m10->rashi", m10, rashi],
]) {
  const line = await fetchWalkingGeometry([a, b]);
  const farm = line ? line.filter(inFarm).length / line.length : 0;
  const north = line ? line.filter((p) => p.lat > 32.0948).length : 0;
  console.log(name, "pts", line?.length, "farm%", Math.round(farm * 100), "north pts", north);
  if (line) {
    const maxLat = Math.max(...line.map((p) => p.lat));
    console.log("  maxLat", maxLat.toFixed(5));
  }
}

const catalog = JSON.parse(readFileSync("public/catalog.json", "utf8"));
const houses = catalog.houses.filter((h) => h.status === "approved");
const route = buildWalkingRoute(houses, { lat: 32.0919, lng: 34.8112 }, { startedFrom: "neighborhood" });
const stops = route.stops.map((s) => ({ lat: s.house.lat, lng: s.house.lng }));
const full = await fetchWalkingGeometry(stops);
console.log("full route pts", full?.length, "farm%", full ? Math.round((full.filter(inFarm).length / full.length) * 100) : null);
console.log("full maxLat", full ? Math.max(...full.map((p) => p.lat)).toFixed(5) : null);
