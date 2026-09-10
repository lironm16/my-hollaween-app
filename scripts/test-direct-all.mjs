import { readFileSync } from "node:fs";
import { buildWalkingRoute, routeGeometryPoints } from "../src/lib/route.ts";

const catalog = JSON.parse(readFileSync("public/catalog.json", "utf8"));
const houses = catalog.houses.filter((h) => h.status === "approved");
const route = buildWalkingRoute(houses, { lat: 32.0919, lng: 34.8112 }, { startedFrom: "neighborhood" });
const waypoints = routeGeometryPoints(route);

const enc = waypoints.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(";");
const url = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${enc}?overview=full&geometries=geojson&steps=false`;
const res = await fetch(url, { headers: { "User-Agent": "test" } });
const data = await res.json();
const coords = data.routes?.[0]?.geometry?.coordinates ?? [];
const line = coords.map(([lng, lat]) => ({ lat, lng }));
const north = line.filter((p) => p.lat > 32.095).length;
const maxLat = Math.max(...line.map((p) => p.lat));
const minLat = Math.min(...line.map((p) => p.lat));
console.log("directAll pts", line.length, "north>32.095", north, "maxLat", maxLat, "minLat", minLat);
