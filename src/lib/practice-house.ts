import { houseMatchesSet, isStubHouse, type HouseSet, type StubFlagHouse } from "@/lib/house-set";
import { schoolCampusDragonTint } from "@/lib/gem-school-campus";
import type { PublicHouse } from "@/lib/types";

/** When true, visitors see practice pins and pre-event demon hunt on them. */
export function practiceHousesVisibleToUsers() {
  return false;
}

export type PracticeFlagHouse = { isPractice?: boolean | undefined };

export function isPracticeHouse(house: PracticeFlagHouse | null | undefined) {
  return house?.isPractice === true;
}

export function stripPracticeHouses<T extends PracticeFlagHouse>(houses: readonly T[]): T[] {
  return houses.filter((house) => !isPracticeHouse(house));
}

/** Rows that participate in neighborhood counts, routes, and the public house set. */
export function isNeighborhoodHouse(house: PracticeFlagHouse & StubFlagHouse) {
  return !isStubHouse(house) && !isPracticeHouse(house);
}

/** Stable dragon hue per practice house (same band as school booths). */
export function practiceDragonTint(house: Pick<PublicHouse, "id" | "boothNumber">) {
  return schoolCampusDragonTint({ ...house, address: "practice", kind: "house" });
}

export function practiceHouseVisibleOnMap(
  house: PracticeFlagHouse & StubFlagHouse,
  opts: { admin: boolean },
) {
  if (!isPracticeHouse(house)) return false;
  if (isStubHouse(house)) return false;
  return opts.admin || practiceHousesVisibleToUsers();
}

/** Houses drawn on the main map (practice for admins only during dev). */
export function housesForMainMap<T extends PracticeFlagHouse & StubFlagHouse>(
  houses: readonly T[],
  houseSet: HouseSet,
  opts: { admin: boolean },
): T[] {
  return houses.filter(
    (house) =>
      houseMatchesSet(house, houseSet) || practiceHouseVisibleOnMap(house, opts),
  );
}
