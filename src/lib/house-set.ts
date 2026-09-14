export const HOUSE_SET_KEY = "hw-house-set";
export const HOUSE_SET_EVENT = "hw-house-set";

export const HOUSE_SETS = ["real", "stubs", "all"] as const;
export type HouseSet = (typeof HOUSE_SETS)[number];

export const HOUSE_SET_LABELS: Record<HouseSet, string> = {
  real: "אמיתיים",
  stubs: "סטאבים",
  all: "הכל",
};

export const HOUSE_SET_STATUS: Record<HouseSet, string> = {
  real: "מציגים בתים אמיתיים",
  stubs: "מציגים סטאבים",
  all: "מציגים הכל",
};

const STUB_ID = /^בית-931\d$/;

export function isStubHouse(house: { id?: string; description?: string }) {
  if (house.id && STUB_ID.test(house.id)) return true;
  return Boolean(house.description?.includes("סטאב לחזרה"));
}

function isHouseSet(value: string | null | undefined): value is HouseSet {
  return Boolean(value && (HOUSE_SETS as readonly string[]).includes(value));
}

export function readHouseSet(): HouseSet {
  if (typeof window === "undefined") return "real";
  try {
    const stored = localStorage.getItem(HOUSE_SET_KEY);
    if (isHouseSet(stored)) return stored;
  } catch {
    /* private mode */
  }
  return "real";
}

export function writeHouseSet(next: HouseSet) {
  if (typeof window === "undefined") return;
  if (readHouseSet() === next) return;
  try {
    localStorage.setItem(HOUSE_SET_KEY, next);
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event(HOUSE_SET_EVENT));
}

export function countSkippedInSet(
  skippedIds: readonly string[],
  houses: readonly { id: string; description?: string }[],
  set: HouseSet,
): number {
  const byId = new Map(houses.map((house) => [house.id, house]));

  if (set === "real") {
    return skippedIds.filter((id) => {
      const house = byId.get(id);
      return house ? !isStubHouse(house) : false;
    }).length;
  }

  if (set === "all") {
    return skippedIds.length;
  }

  // Stubs rehearsal: count every skipped stub, even when the id only exists in catalog.
  return skippedIds.filter((id) => {
    const house = byId.get(id);
    return house ? isStubHouse(house) : STUB_ID.test(id);
  }).length;
}

export function houseMatchesSet(house: { id?: string; description?: string }, set: HouseSet) {
  if (set === "all") return true;
  const stub = isStubHouse(house);
  return set === "stubs" ? stub : !stub;
}
