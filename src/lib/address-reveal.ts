import { formatAdminDisplayAddress } from "@/lib/admin-house-location";
import { config, formatDisplayAddress, resolveNeighborhood, type NeighborhoodId } from "@/lib/config";
import { mergeAddressRevealSchedule } from "@/lib/event-settings";
import type { AddressRevealSchedule, PublicHouse } from "@/lib/types";

export type AddressRevealContext = {
  now: Date;
  isAdmin: boolean;
  ownedHouseIds: ReadonlySet<string>;
  addressReveal: AddressRevealSchedule;
};

/** Local time on event night when street addresses and arrival notes become public. */
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

export function addressHiddenHintHe(now = new Date(), schedule = mergeAddressRevealSchedule()) {
  const { labelHe } = config.eventNight;
  if (isAddressRevealed(now, schedule)) return "";
  return `הכתובת תיחשף ב-${labelHe}`;
}

export function canViewHouseLocationDetails(
  houseId: string,
  ctx: AddressRevealContext,
): boolean {
  if (isAddressRevealed(ctx.now, ctx.addressReveal)) return true;
  if (ctx.isAdmin) return true;
  return ctx.ownedHouseIds.has(houseId);
}

export function redactHouseLocationDetails<T extends Pick<PublicHouse, "address" | "arrival">>(
  house: T,
): T {
  return { ...house, address: "", arrival: "" };
}

/** Strip location fields for the public catalog before reveal time. */
export function publicHouseForCatalog(
  house: PublicHouse,
  now = new Date(),
  schedule = mergeAddressRevealSchedule(),
): PublicHouse {
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
    if (ctx.isAdmin) return formatAdminDisplayAddress(house);
    return formatDisplayAddress(house);
  }
  const hint = addressHiddenHintHe(ctx.now, ctx.addressReveal);
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

/** Strip address/arrival on rows the viewer may not see (e.g. admin user preview). */
export function housesWithLocationPolicy(
  houses: readonly PublicHouse[],
  ctx: AddressRevealContext,
): PublicHouse[] {
  return houses.map((house) =>
    canViewHouseLocationDetails(house.id, ctx) ? house : redactHouseLocationDetails(house),
  );
}

export function houseWithLocationPolicy(house: PublicHouse, ctx: AddressRevealContext): PublicHouse {
  return canViewHouseLocationDetails(house.id, ctx) ? house : redactHouseLocationDetails(house);
}

export function makeAddressRevealContext(input: {
  now: Date;
  isAdmin?: boolean;
  ownedHouseIds?: Iterable<string>;
  addressReveal?: AddressRevealSchedule;
}): AddressRevealContext {
  return {
    now: input.now,
    isAdmin: Boolean(input.isAdmin),
    ownedHouseIds: new Set(input.ownedHouseIds ?? []),
    addressReveal: mergeAddressRevealSchedule(input.addressReveal),
  };
}

/** תצוגת משתמש — same reveal rules as a signed-out visitor (owned houses still see their row). */
export function visitorAddressRevealContext(
  now: Date,
  ownedHouseIds?: Iterable<string>,
  addressReveal?: AddressRevealSchedule,
): AddressRevealContext {
  return makeAddressRevealContext({ now, isAdmin: false, ownedHouseIds, addressReveal });
}
