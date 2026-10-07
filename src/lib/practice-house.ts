import { isStubHouse, type StubFlagHouse } from "@/lib/house-set";
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

