import { promises as fs } from "node:fs";
import path from "node:path";
import { isStubHouse } from "@/lib/house-set";

const SEED_PATH = path.join(process.cwd(), "data/seed.json");
const DROPPED_STUB_IDS = new Set(["בית-9316"]);
const REHEARSAL_ONLY_STUB_ID = /^בית-931\d$/;
const REHEARSAL_MARKER = /^סטאב לחזרה\s*[—–-]\s*/u;

type StubRow = { id: string; description?: string; [key: string]: unknown };

let cachedRows: StubRow[] | null = null;

/** Rehearsal houses ship in seed.json only — never stored or read from Firestore. */
export async function loadStaticRehearsalStubRows(): Promise<StubRow[]> {
  if (cachedRows) return cachedRows;
  const raw = JSON.parse(await fs.readFile(SEED_PATH, "utf8")) as { houses?: StubRow[] };
  cachedRows = (raw.houses ?? []).filter(
    (house) => house.id && !DROPPED_STUB_IDS.has(house.id) && isStubHouse(house),
  );
  return cachedRows;
}

export function stripStubHouses<T extends { id?: string; description?: string }>(
  houses: readonly T[],
): T[] {
  return houses.filter((house) => !isStubHouse(house));
}

/** Turn rehearsal seed rows into production-like houses for isolated DATA_DIR servers. */
export function housesForIsolatedTestDb<T extends { id?: string; description?: string }>(
  houses: readonly T[],
): T[] {
  return houses
    .filter((house) => !REHEARSAL_ONLY_STUB_ID.test(house.id ?? ""))
    .map((house) => {
      const description = house.description ?? "";
      if (!description.includes("סטאב לחזרה")) return house;
      return { ...house, description: description.replace(REHEARSAL_MARKER, "") };
    });
}
