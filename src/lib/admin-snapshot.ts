import { isPoiHouse } from "@/lib/house-kind";
import { houseMatchesSet, type HouseSet } from "@/lib/house-set";
import { isOpeningSoon, isClosingSoon, isOnBreak, isOpenNow } from "@/lib/hours";
import {
  candyLevel,
  effectiveVisit,
  isOwnerFrozen,
  isPubliclyListed,
  markedCandy,
  offersSensitivity,
  resolveDecorLevel,
} from "@/lib/house-state";
import type { House, PublicHouse, ScareLevel } from "@/lib/types";

export type SnapshotHouse = House | PublicHouse;

export type AdminSnapshot = {
  houses: number;
  pois: number;
  openNow: number;
  openingSoon: number;
  closingSoon: number;
  onBreak: number;
  closed: number;
  candyNone: number;
  candyPlenty: number;
  candyLow: number;
  candyOut: number;
  notDecorated: number;
  scareMild: number;
  scareMedium: number;
  scareSpicy: number;
  accessible: number;
  glutenFree: number;
  nutsFree: number;
  sesameFree: number;
  vegan: number;
};

function scareOf(house: SnapshotHouse): ScareLevel | "none" {
  if (resolveDecorLevel(house) === "none") return "none";
  return house.scareLevel ?? "mild";
}

export type SnapshotStats = Pick<
  AdminSnapshot,
  | "houses"
  | "pois"
  | "openNow"
  | "openingSoon"
  | "closingSoon"
  | "onBreak"
  | "closed"
  | "candyNone"
  | "candyPlenty"
  | "candyLow"
  | "candyOut"
  | "notDecorated"
  | "scareMild"
  | "scareMedium"
  | "scareSpicy"
  | "accessible"
  | "glutenFree"
  | "nutsFree"
  | "sesameFree"
  | "vegan"
>;

export function buildSnapshotStats(input: {
  houses: SnapshotHouse[];
  now?: Date;
  houseSet?: HouseSet;
}): SnapshotStats {
  const snapshot = buildAdminSnapshot({
    houses: input.houses,
    now: input.now,
    houseSet: input.houseSet,
  });
  const {
    houses,
    pois,
    openNow,
    openingSoon,
    closingSoon,
    onBreak,
    closed,
    candyNone,
    candyPlenty,
    candyLow,
    candyOut,
    notDecorated,
    scareMild,
    scareMedium,
    scareSpicy,
    accessible,
    glutenFree,
    nutsFree,
    sesameFree,
    vegan,
  } = snapshot;
  return {
    houses,
    pois,
    openNow,
    openingSoon,
    closingSoon,
    onBreak,
    closed,
    candyNone,
    candyPlenty,
    candyLow,
    candyOut,
    notDecorated,
    scareMild,
    scareMedium,
    scareSpicy,
    accessible,
    glutenFree,
    nutsFree,
    sesameFree,
    vegan,
  };
}

export function buildAdminSnapshot(input: {
  houses: SnapshotHouse[];
  now?: Date;
  /** Public תמונת מצב should count real houses only — not rehearsal stubs. */
  houseSet?: HouseSet;
}): AdminSnapshot {
  const now = input.now ?? new Date();
  const houseSet = input.houseSet ?? "real";
  const listed = input.houses.filter(isPubliclyListed).filter((house) => houseMatchesSet(house, houseSet));
  const candyOf = (house: SnapshotHouse) =>
    markedCandy(house) ? candyLevel(house) : null;

  return {
    houses: listed.filter((house) => !isPoiHouse(house)).length,
    pois: listed.filter((house) => isPoiHouse(house)).length,
    openNow: listed.filter((house) => isOpenNow(house, now)).length,
    openingSoon: listed.filter((house) => isOpeningSoon(house, now)).length,
    closingSoon: listed.filter((house) => isClosingSoon(house, now)).length,
    onBreak: listed.filter((house) => isOwnerFrozen(house) || isOnBreak(house, now)).length,
    closed: listed.filter((house) => effectiveVisit(house) === "closed").length,
    candyNone: listed.filter((house) => candyOf(house) === null).length,
    candyPlenty: listed.filter((house) => candyOf(house) === "plenty").length,
    candyLow: listed.filter((house) => candyOf(house) === "low").length,
    candyOut: listed.filter((house) => candyOf(house) === "out").length,
    notDecorated: listed.filter((house) => scareOf(house) === "none").length,
    scareMild: listed.filter((house) => scareOf(house) === "mild").length,
    scareMedium: listed.filter((house) => scareOf(house) === "medium").length,
    scareSpicy: listed.filter((house) => scareOf(house) === "spicy").length,
    accessible: listed.filter((house) => house.accessible).length,
    glutenFree: listed.filter((house) => offersSensitivity(house, "glutenFree")).length,
    nutsFree: listed.filter((house) => offersSensitivity(house, "nutsFree")).length,
    sesameFree: listed.filter((house) => offersSensitivity(house, "sesameFree")).length,
    vegan: listed.filter((house) => offersSensitivity(house, "vegan")).length,
  };
}
