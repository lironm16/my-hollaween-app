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

async function readFirestoreCatalog() {
  if (!process.env.FIREBASE_PROJECT_ID?.trim()) return null;
  try {
    const { readFirestoreCatalog: readCatalog } = await import("../src/lib/firestore-db.ts");
    const { asCatalogForSnapshot } = await import("../src/lib/catalog-cache-build.ts");
    const remote = await readCatalog();
    if (!remote?.houses?.length) return null;
    return asCatalogForSnapshot(remote.houses, remote.updatedAt, remote.pushSettings);
  } catch (error) {
    console.warn("[build-catalog] firestore read skipped:", error instanceof Error ? error.message : error);
    return null;
  }
}

const catalog = (await readFirestoreCatalog()) ?? (await readSeedCatalog());

let out = catalog;
if (process.env.NEXT_PUBLIC_ACCESS_GATE === "1") {
  out = {
    ...catalog,
    houses: [],
    houseCount: catalog.houseCount ?? catalog.houses.length,
    accessTier: "limited",
    accessRegistrations: [],
  };
}

writeFileSync(join(root, "public/catalog.json"), JSON.stringify(out));
console.log(`wrote public/catalog.json (${out.houses.length} houses, gate=${process.env.NEXT_PUBLIC_ACCESS_GATE === "1"})`);
