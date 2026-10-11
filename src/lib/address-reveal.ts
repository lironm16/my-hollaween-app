import { config, formatDisplayAddress, resolveNeighborhood, type NeighborhoodId } from "@/lib/config";
import { isPracticeHouse } from "@/lib/practice-house";
import { mergeAddressRevealSchedule } from "@/lib/event-settings";
import type { AddressRevealSchedule, PublicHouse } from "@/lib/types";

export type AddressRevealContext = {
  now: Date;
  isAdmin: boolean;
  ownedHouseIds: ReadonlySet<string>;
  addressReveal: AddressRevealSchedule;
  /**
   * Night passes: `everyone` = off (legacy reveal for all), `registered` = this device holds a pass,
   * `none` = unregistered — home addresses never open.
   */
  audience: AddressRevealAudience;
  /** Businesses / schools (and homes sharing their pin) — address open to everyone. */
  publicLocationIds: ReadonlySet<string>;
};

export type AddressRevealAudience = "everyone" | "registered" | "none";

export const ADDRESS_FOR_REGISTERED_HINT_HE = "הכתובת תיחשף למשתמשים רשומים";

/** Local time on event night when street addresses, arrival and visitor notes become public. */
export function addressRevealTime(
  schedule = mergeAddressRevealSchedule(),
  reference = new Date(),
) {
  void reference;
  const { year, month, day } = config.eventNight;
  return new Date(year, month - 1, day, schedule.hour, schedule.minute, 0, 0);
}

export function isAddressRevealed(now = new Date(), schedule = mergeAddressRevealSchedule()) {
  return now.getTime() >= addressRevealTime(schedule, now).getTime();
}

export function addressHiddenHintHe(
  now = new Date(),
  schedule = mergeAddressRevealSchedule(),
  audience: AddressRevealAudience = "everyone",
) {
  const { labelHe } = config.eventNight;
  if (audience === "none") return ADDRESS_FOR_REGISTERED_HINT_HE;
  if (isAddressRevealed(now, schedule)) return "";
  return `הכתובת תיחשף ב-${labelHe}`;
}

export function canViewHouseLocationDetails(
  houseId: string,
  ctx: AddressRevealContext,
): boolean {
  if (ctx.publicLocationIds.has(houseId)) return true;
  if (ctx.isAdmin) return true;
  if (ctx.ownedHouseIds.has(houseId)) return true;
  if (ctx.audience === "none") return false;
  return isAddressRevealed(ctx.now, ctx.addressReveal);
}

export function redactHouseLocationDetails<
  T extends Pick<PublicHouse, "address" | "arrival"> & { notes?: string },
>(house: T): T {
  return { ...house, address: "", arrival: "", ...(house.notes !== undefined ? { notes: "" } : {}) };
}

/** Strip location fields for the public catalog before reveal time. */
export function publicHouseForCatalog(
  house: PublicHouse,
  now = new Date(),
  schedule = mergeAddressRevealSchedule(),
): PublicHouse {
  if (isPracticeHouse(house)) return house;
  if (isAddressRevealed(now, schedule)) return house;
  return redactHouseLocationDetails(house);
}

export function formatDisplayAddressWithPolicy(
  house: {
    address: string;
    neighborhood?: NeighborhoodId | null;
    lat?: number;
    lng?: number;
  },
  houseId: string,
  ctx: AddressRevealContext,
): string {
  if (canViewHouseLocationDetails(houseId, ctx)) {
    return formatDisplayAddress(house);
  }
  const hint = addressHiddenHintHe(ctx.now, ctx.addressReveal, ctx.audience);
  const area = resolveNeighborhood(house);
  if (area && hint) return `${area} · ${hint}`;
  return hint || formatDisplayAddress(house);
}

export function visibleArrivalWithPolicy(
  house: Pick<PublicHouse, "arrival">,
  houseId: string,
  ctx: AddressRevealContext,
): string {
  if (!canViewHouseLocationDetails(houseId, ctx)) return "";
  return house.arrival?.trim() ?? "";
}

export function mapsNavigationAllowed(houseId: string, ctx: AddressRevealContext) {
  return canViewHouseLocationDetails(houseId, ctx);
}

/** Strip address/arrival/notes on rows the viewer may not see (e.g. admin user preview). */
export function housesWithLocationPolicy(
  houses: readonly PublicHouse[],
  ctx: AddressRevealContext,
): PublicHouse[] {
  return houses.map((house) =>
    isPracticeHouse(house) || house.locationPublic || canViewHouseLocationDetails(house.id, ctx)
      ? house
      : redactHouseLocationDetails(house),
  );
}

export function houseWithLocationPolicy(house: PublicHouse, ctx: AddressRevealContext): PublicHouse {
  return isPracticeHouse(house) || house.locationPublic || canViewHouseLocationDetails(house.id, ctx)
    ? house
    : redactHouseLocationDetails(house);
}

export function makeAddressRevealContext(input: {
  now: Date;
  isAdmin?: boolean;
  ownedHouseIds?: Iterable<string>;
  addressReveal?: AddressRevealSchedule;
  audience?: AddressRevealAudience;
  publicLocationIds?: Iterable<string>;
}): AddressRevealContext {
  return {
    now: input.now,
    isAdmin: Boolean(input.isAdmin),
    ownedHouseIds: new Set(input.ownedHouseIds ?? []),
    addressReveal: mergeAddressRevealSchedule(input.addressReveal),
    audience: input.audience ?? "everyone",
    publicLocationIds: new Set(input.publicLocationIds ?? []),
  };
}

/** תצוגת משתמש — same reveal rules as a signed-out visitor (owned houses still see their row). */
export function visitorAddressRevealContext(
  now: Date,
  ownedHouseIds?: Iterable<string>,
  addressReveal?: AddressRevealSchedule,
  audience?: AddressRevealAudience,
): AddressRevealContext {
  return makeAddressRevealContext({ now, isAdmin: false, ownedHouseIds, addressReveal, audience });
}
