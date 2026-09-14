import { promises as fs } from "node:fs";
import path from "node:path";
import { isStubHouse } from "@/lib/house-set";

const SEED_PATH = path.join(process.cwd(), "data/seed.json");
const DROPPED_STUB_IDS = new Set(["בית-9316"]);

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
