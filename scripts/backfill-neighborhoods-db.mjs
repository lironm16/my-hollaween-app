#!/usr/bin/env node
/**
 * Persist legacy calculated hoods into the live house db (Vercel Blob / file).
 *
 *   DRY_RUN=1 node --import tsx scripts/backfill-neighborhoods-db.mjs
 *   MODE=all node --import tsx scripts/backfill-neighborhoods-db.mjs
 */
import { isStubHouse } from "../src/lib/house-set.ts";
import { planNeighborhoodBackfill } from "../src/lib/neighborhood-backfill.ts";
import { runSyncedWrite } from "../src/lib/store/core.ts";

const dryRun = process.env.DRY_RUN === "1";
const mode = process.env.MODE === "all" ? "all" : "missing";

const result = await runSyncedWrite((db) => {
  const real = db.houses.filter((h) => !isStubHouse(h));
  const planned = planNeighborhoodBackfill(real, mode);
  if (!dryRun) {
    const byId = new Map(planned.map((entry) => [entry.id, entry.to]));
    for (const house of db.houses) {
      const to = byId.get(house.id);
      if (to !== undefined) house.neighborhood = to;
    }
    db.updatedAt = new Date().toISOString();
  }
  return {
    dryRun,
    mode,
    changed: planned.length,
    changes: planned.slice(0, 50),
    truncated: planned.length > 50,
  };
});

console.log(JSON.stringify(result, null, 2));
