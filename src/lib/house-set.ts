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

/** Stub/real filter reads only `isStub` / `deviceCacheStub`; other house fields are ignored. */
export type StubFlagHouse = {
  isStub?: boolean;
  /** @deprecated Offline cache before `isStub` was persisted on strip. */
  deviceCacheStub?: boolean;
  id?: string;
  deviceCachePin?: boolean;
};

export function isStubHouse(house: StubFlagHouse | null | undefined) {
  if (!house) return false;
  if (house.isStub === true) return true;
  if (house.deviceCacheStub === true) return true;
  return false;
}

/** Drop legacy QA rows still marked `isStub` in Firestore or old exports. */
export function stripStubHouses<T extends StubFlagHouse>(houses: readonly T[]): T[] {
  return houses.filter((house) => !isStubHouse(house));
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

export function countIdsInSet(
  ids: readonly string[],
  houses: readonly { id: string; isStub?: boolean; deviceCacheStub?: boolean }[],
  set: HouseSet,
): number {
  const byId = new Map(houses.map((house) => [house.id, house]));

  if (set === "real") {
    return ids.filter((id) => {
      const house = byId.get(id);
      return house ? !isStubHouse(house) : false;
    }).length;
  }

  if (set === "all") {
    return ids.length;
  }

  return ids.filter((id) => {
    const house = byId.get(id);
    return house ? isStubHouse(house) : false;
  }).length;
}

export function countLikedInSet(
  likedIds: readonly string[],
  houses: readonly { id: string; isStub?: boolean; deviceCacheStub?: boolean }[],
  set: HouseSet,
): number {
  return countIdsInSet(likedIds, houses, set);
}

export function countSkippedInSet(
  skippedIds: readonly string[],
  houses: readonly { id: string; isStub?: boolean; deviceCacheStub?: boolean }[],
  set: HouseSet,
): number {
  return countIdsInSet(skippedIds, houses, set);
}

export function countVisitedInSet(
  visitedIds: readonly string[],
  houses: readonly { id: string; isStub?: boolean; deviceCacheStub?: boolean }[],
  set: HouseSet,
): number {
  return countIdsInSet(visitedIds, houses, set);
}

export function houseMatchesSet(
  house: StubFlagHouse & { isPractice?: boolean },
  set: HouseSet,
) {
  if (set === "all") return true;
  const stub = isStubHouse(house);
  const practice = house.isPractice === true;
  if (set === "stubs") return stub;
  return !stub && !practice;
}

/** Device cache rows must carry `isStub` (or legacy deviceCacheStub) so real/stub filters work offline. */
export function catalogHasExplicitStubFlags(
  catalog: { houses: readonly StubFlagHouse[] } | null,
): boolean {
  if (!catalog?.houses.length) return false;
  return catalog.houses.every(
    (house) => typeof house.isStub === "boolean" || house.deviceCacheStub === true,
  );
}

export function catalogHasRealHouses(catalog: { houses: readonly StubFlagHouse[] } | null) {
  if (!catalog?.houses.length) return false;
  if (!catalogHasExplicitStubFlags(catalog)) return false;
  return catalog.houses.some((house) => !isStubHouse(house));
}

/**
 * Non-admins see real houses only (preview URLs match production visitors).
 * Admins on preview may fall back to **all** when the catalog is stub-only for QA.
 */
export function resolveViewerHouseSet(
  catalog: { houses: { isStub?: boolean; deviceCacheStub?: boolean }[] } | null,
  admin: boolean,
  preferred: HouseSet,
  options?: { previewDeployment?: boolean },
): HouseSet {
  const preview = options?.previewDeployment === true;
  const stubOnly =
    Boolean(catalog?.houses.length) && catalogHasRealHouses(catalog) === false;
  if (admin) {
    if (preview && stubOnly && preferred === "real") return "all";
    return preferred;
  }
  return "real";
}

/** Admin UI pages honor the manager house-set toggle; visitors stay on real-only (or preview fallback). */
export function activeHouseSetForSession(
  admin: boolean,
  houseSet: HouseSet,
  catalog: { houses: { isStub?: boolean; deviceCacheStub?: boolean }[] } | null,
  options?: { previewDeployment?: boolean },
): HouseSet {
  if (admin) return houseSet;
  return resolveViewerHouseSet(catalog, false, "real", options);
}
