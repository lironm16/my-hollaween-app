import { readFileSync } from "node:fs";
import { buildWalkingRoute } from "../src/lib/route.ts";
import { fetchWalkingGeometry } from "../src/lib/osrm-walk.ts";
import { routePreviewPoints } from "../src/lib/route.ts";

const catalog = JSON.parse(readFileSync("public/catalog.json", "utf8"));
const houses = catalog.houses.filter((h) => h.status === "approved");
const route = buildWalkingRoute(houses, { lat: 32.0919, lng: 34.8112 }, { startedFrom: "neighborhood" });

route.stops.forEach((s) => {
  console.log(s.order, s.house.address.slice(0, 28), s.house.lat.toFixed(5), s.house.lng.toFixed(5));
});

const slice = route.stops.slice(10, 23).map((s) => ({ lat: s.house.lat, lng: s.house.lng }));
const preview = slice;
console.log("\n--- stops 11-23 geometry ---");
const line = await fetchWalkingGeometry(slice);
console.log("street maxLat", line ? Math.max(...line.map((p) => p.lat)).toFixed(5) : null, "pts", line?.length);

// Check if preview would look like loop
console.log("preview hops:");
for (let i = 1; i < slice.length; i++) {
  const a = slice[i - 1], b = slice[i];
  const d = Math.hypot(a.lat - b.lat, a.lng - b.lng) * 111000;
  console.log(`  ${i}->${i+1}: ${Math.round(d)}m, lat ${a.lat.toFixed(4)} to ${b.lat.toFixed(4)}`);
}
