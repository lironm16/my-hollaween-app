import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function readSeedCatalog() {
  const { asCatalogForSnapshot } = await import("../src/lib/catalog-cache-build.ts");
  const seed = JSON.parse(readFileSync(join(root, "data/seed.json"), "utf8"));
  const houses = seed.houses.map((h) => {
    const house = { ...h };
    delete house.editCode;
    delete house.status;
    delete house.rejectionReason;
    return house;
  });
  return asCatalogForSnapshot(houses, seed.updatedAt);
}

/** Night passes on: the static bundle is public — businesses / schools only, like `/api/catalog`. */
async function scopeForNightPasses(catalog, houses) {
  const { readNightPassSettings } = await import("../src/lib/night-pass-store.ts");
  if (!(await readNightPassSettings()).enabled) return catalog;
  const { PUBLIC_NIGHT_PASS_SCOPE, scopeHousesForViewer } = await import("../src/lib/night-pass-scope.ts");
  const { toPublicHouse } = await import("../src/lib/ids.ts");
  const rows = houses.filter((house) => !house.deletedAt).map((house) => toPublicHouse(house));
  const scoped = scopeHousesForViewer(rows, PUBLIC_NIGHT_PASS_SCOPE);
  console.log(`[build-catalog] night passes on — public bundle (${scoped.hiddenHouseCount} homes hidden)`);
  return {
    ...catalog,
    houses: scoped.houses,
    houseCount: scoped.houses.length,
    scope: "public",
    hiddenHouseCount: scoped.hiddenHouseCount,
  };
}

async function readFirestoreCatalog() {
  if (!process.env.FIREBASE_PROJECT_ID?.trim()) return null;
  try {
    const { readFirestoreCatalog: readCatalog } = await import("../src/lib/firestore-db.ts");
    const { asCatalogForSnapshot } = await import("../src/lib/catalog-cache-build.ts");
    const remote = await readCatalog();
    if (!remote?.houses?.length) return null;
    const catalog = asCatalogForSnapshot(remote.houses, remote.updatedAt, remote.pushSettings);
    return await scopeForNightPasses(catalog, remote.houses);
  } catch (error) {
    console.warn("[build-catalog] firestore read skipped:", error instanceof Error ? error.message : error);
    return null;
  }
}

const catalog = (await readFirestoreCatalog()) ?? (await readSeedCatalog());

writeFileSync(join(root, "public/catalog.json"), JSON.stringify(catalog));
console.log(`wrote public/catalog.json (${catalog.houses.length} houses)`);
