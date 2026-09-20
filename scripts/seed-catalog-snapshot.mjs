#!/usr/bin/env node
/**
 * Seed the shared catalog snapshot from live Firestore into Vercel Blob
 * and public/catalog.json. Run once after deploying read-reduction changes
 * so cold server instances skip a full houses collection read.
 *
 * Requires the same env as production:
 *   FIREBASE_* / FIREBASE_SERVICE_ACCOUNT_JSON
 *   BLOB_READ_WRITE_TOKEN (for cross-instance cache)
 *
 *   npm run seed:catalog-snapshot
 */
import { publishCatalogSnapshot } from "../src/lib/catalog-cache.ts";
import { firestoreConfigured, readFirestoreCatalog } from "../src/lib/firestore-db.ts";

async function main() {
  if (!firestoreConfigured()) {
    console.error(
      "Firestore is not configured. Set FIREBASE_PROJECT_ID and credentials, then retry.",
    );
    process.exit(1);
  }

  const catalog = await readFirestoreCatalog();
  if (!catalog?.houses?.length) {
    console.error("No houses returned from Firestore — nothing to seed.");
    process.exit(1);
  }

  await publishCatalogSnapshot({
    ...catalog,
    pushSubscriptions: [],
  });

  console.log(
    `Seeded catalog snapshot: ${catalog.houses.length} houses, updatedAt=${catalog.updatedAt}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
