#!/usr/bin/env node
/**
 * Repair Firestore catalog meta `houseCount` when bumps omitted the count (stale meta on deltas).
 *
 *   DRY_RUN=1 node --import tsx scripts/backfill-catalog-meta-house-count.mjs
 *   node --import tsx scripts/backfill-catalog-meta-house-count.mjs
 */
import { countPublishedHouses } from "../src/lib/catalog-cache-build.ts";
import { bumpCatalogMeta, firestoreConfigured, readCatalogMeta, readFirestoreCatalog } from "../src/lib/firestore-db.ts";

if (!firestoreConfigured()) {
  console.error("Firestore is not configured in this environment.");
  process.exit(1);
}

const dryRun = process.env.DRY_RUN === "1";
const [meta, catalog] = await Promise.all([readCatalogMeta(), readFirestoreCatalog()]);
if (!catalog) {
  console.error("Could not read Firestore catalog.");
  process.exit(1);
}

const count = countPublishedHouses(catalog.houses);
const payload = {
  dryRun,
  metaHouseCount: meta?.houseCount ?? null,
  counted: count,
  updatedAt: catalog.updatedAt,
};

if (!dryRun && count >= 0) {
  await bumpCatalogMeta(catalog.updatedAt, count);
}

console.log(JSON.stringify(payload, null, 2));
