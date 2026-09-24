import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readSeedCatalog() {
  const seed = JSON.parse(readFileSync(join(root, "data/seed.json"), "utf8"));
  const houses = seed.houses.map((h) => {
    const house = { ...h };
    delete house.editCode;
    delete house.status;
    delete house.rejectionReason;
    return house;
  });
  return {
    updatedAt: seed.updatedAt,
    neighborhood: process.env.NEXT_PUBLIC_NEIGHBORHOOD_NAME ?? "שיכון ותיקים · חרוזים · נחלת גנים",
    houses,
    houseCount: houses.length,
  };
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

const catalog = (await readFirestoreCatalog()) ?? readSeedCatalog();

writeFileSync(join(root, "public/catalog.json"), JSON.stringify(catalog));
console.log(`wrote public/catalog.json (${catalog.houses.length} houses)`);
