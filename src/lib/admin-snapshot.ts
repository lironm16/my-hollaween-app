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
import { subscriptionAllowsTopic } from "@/lib/push-topics";
import type { House, PushSubscriptionRecord, ScareLevel } from "@/lib/types";

export type AdminSnapshot = {
  devicesSeen: number;
  online: number;
  devicesNewHouse: number;
  devicesHouseStatus: number;
  devicesAdmin: number;
  houses: number;
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
};

function scareOf(house: House): ScareLevel | "none" {
  if (resolveDecorLevel(house) === "none") return "none";
  return house.scareLevel ?? "mild";
}

export function buildAdminSnapshot(input: {
  houses: House[];
  subscriptions: PushSubscriptionRecord[];
  devicesSeen: number;
  online: number;
  now?: Date;
  /** Public תמונת מצב should count real houses only — not rehearsal stubs. */
  houseSet?: HouseSet;
}): AdminSnapshot {
  const now = input.now ?? new Date();
  const houseSet = input.houseSet ?? "real";
  const listed = input.houses.filter(isPubliclyListed).filter((house) => houseMatchesSet(house, houseSet));
  const candyOf = (house: House) =>
    markedCandy(house) ? candyLevel(house) : null;

  return {
    devicesSeen: input.devicesSeen,
    online: input.online,
    devicesNewHouse: input.subscriptions.filter((item) =>
      subscriptionAllowsTopic(item, "newHouse"),
    ).length,
    devicesHouseStatus: input.subscriptions.filter((item) =>
      subscriptionAllowsTopic(item, "houseStatus"),
    ).length,
    devicesAdmin: input.subscriptions.filter((item) =>
      subscriptionAllowsTopic(item, "admin"),
    ).length,
    houses: listed.length,
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
  };
}
