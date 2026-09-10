import { readFileSync } from "node:fs";
import { buildWalkingRoute } from "../src/lib/route.ts";
import { fetchWalkingGeometry } from "../src/lib/osrm-walk.ts";

const catalog = JSON.parse(readFileSync("public/catalog.json", "utf8"));
const houses = catalog.houses.filter((h) => h.status === "approved");
const route = buildWalkingRoute(houses, { lat: 32.0919, lng: 34.8112 }, { startedFrom: "neighborhood" });

// East cluster stops (order 16+)
const east = route.stops.filter((s) => s.house.lng > 34.809);
console.log("east stops", east.map((s) => `${s.order}:${s.house.address.slice(0, 20)}`));

const pts = east.map((s) => ({ lat: s.house.lat, lng: s.house.lng }));
const line = await fetchWalkingGeometry(pts);
if (line) {
  console.log("line pts", line.length, "maxLat", Math.max(...line.map((p) => p.lat)).toFixed(5));
  const north = line.filter((p) => p.lat > 32.095);
  console.log("north of 32.095", north.length);
}

// Preview straight lines
let straightNorth = 0;
for (let i = 1; i < pts.length; i++) {
  const steps = 10;
  for (let t = 0; t <= steps; t++) {
    const lat = pts[i - 1].lat + (pts[i].lat - pts[i - 1].lat) * (t / steps);
    if (lat > 32.095) straightNorth++;
  }
}
console.log("straight preview north samples", straightNorth);
