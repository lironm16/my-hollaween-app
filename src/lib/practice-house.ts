import { isStubHouse, type StubFlagHouse } from "@/lib/house-set";

/** Legacy catalog rows — feature removed; keep filtering helpers until data is cleaned. */
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
