/**
 * One-off: align split address-cluster pins to top GET /api/address hit per building.
 * Usage: node --import tsx scripts/align-split-cluster-coords.mjs [--dry-run]
 */
import { searchPreparedAddresses } from "../src/lib/address-fields.ts";
import { readFirestoreHouse, writeFirestoreHouse } from "../src/lib/firestore-db.ts";
import { alignPublicHouseCoords } from "../src/lib/house-footprint-align.ts";

const dryRun = process.argv.includes("--dry-run");

const GROUPS = [
  {
    query: "הרצל 75",
    ids: ["בית-3067", "בית-5448"],
  },
  {
    query: "אנה פרנק 6",
    ids: ["בית-3382", "בית-4781"],
  },
];

for (const group of GROUPS) {
  const hits = await searchPreparedAddresses(group.query);
  const top = hits[0];
  if (!top) {
    console.error("No geocode hit for", group.query);
    process.exit(1);
  }
  console.log(`\n${group.query} → ${top.lat}, ${top.lng} (${top.id})`);
  for (const id of group.ids) {
    const before = await readFirestoreHouse(id);
    if (!before) {
      console.error("Missing house", id);
      process.exit(1);
    }
    console.log(`  ${id}: ${before.lat}, ${before.lng} → ${top.lat}, ${top.lng}`);
    if (dryRun) continue;
    const aligned = alignPublicHouseCoords({
      ...before,
      lat: top.lat,
      lng: top.lng,
    });
    const updated = {
      ...before,
      lat: aligned.lat,
      lng: aligned.lng,
      updatedAt: new Date().toISOString(),
    };
    await writeFirestoreHouse(updated);
    console.log(`  saved ${updated.id} at ${updated.lat}, ${updated.lng}`);
  }
}

console.log(dryRun ? "\n(dry run — no writes)" : "\nDone.");
