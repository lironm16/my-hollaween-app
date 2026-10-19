import { readFileSync } from "fs";
import { gemAnchorForHouse } from "../src/lib/gem-hunt.ts";
import { distanceMeters } from "../src/lib/geo.ts";
import { gemHuntMapHouses } from "../src/lib/gem-monsters.ts";
import { GEM_ANCHOR_PLACE_MAX_METERS } from "../src/lib/gem-anchor-placement.ts";

const cat = JSON.parse(readFileSync("public/catalog.json", "utf8"));
const houses = cat.houses ?? [];
const mapHouses = gemHuntMapHouses(houses, "all");
const maxM = GEM_ANCHOR_PLACE_MAX_METERS;
const bad = [];
for (const h of mapHouses) {
  const a = gemAnchorForHouse(h);
  const d = distanceMeters(h, a);
  if (d > maxM + 0.05) bad.push({ id: h.id, d: Math.round(d * 10) / 10, placed: Boolean(a.placed) });
}
bad.sort((a, b) => b.d - a.d);
console.log(JSON.stringify({ mapGemHouses: mapHouses.length, beyond40m: bad.length, rows: bad }, null, 2));
