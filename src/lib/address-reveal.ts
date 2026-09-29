import { config, formatDisplayAddress, resolveNeighborhood, type NeighborhoodId } from "@/lib/config";
import type { PublicHouse } from "@/lib/types";

export type AddressRevealContext = {
  now: Date;
  isAdmin: boolean;
  ownedHouseIds: ReadonlySet<string>;
};

/** Local time on event night when street addresses and arrival notes become public. */
export function addressRevealTime(reference = new Date()) {
  void reference;
  const { year, month, day } = config.eventNight;
  const { hour, minute } = config.addressReveal;
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

export function isAddressRevealed(now = new Date()) {
  return now.getTime() >= addressRevealTime(now).getTime();
}

export function addressHiddenHintHe(now = new Date()) {
  const { labelHe } = config.eventNight;
  if (isAddressRevealed(now)) return "";
  return `הכתובת תיחשף ב-${labelHe}`;
}

export function canViewHouseLocationDetails(
  houseId: string,
  ctx: AddressRevealContext,
): boolean {
  if (isAddressRevealed(ctx.now)) return true;
  if (ctx.isAdmin) return true;
  return ctx.ownedHouseIds.has(houseId);
}

export function redactHouseLocationDetails<T extends Pick<PublicHouse, "address" | "arrival">>(
  house: T,
): T {
  return { ...house, address: "", arrival: "" };
}

/** Strip location fields for the public catalog before reveal time. */
export function publicHouseForCatalog(house: PublicHouse, now = new Date()): PublicHouse {
  if (isAddressRevealed(now)) return house;
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
  const hint = addressHiddenHintHe(ctx.now);
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

export function makeAddressRevealContext(input: {
  now: Date;
  isAdmin?: boolean;
  ownedHouseIds?: Iterable<string>;
}): AddressRevealContext {
  return {
    now: input.now,
    isAdmin: Boolean(input.isAdmin),
    ownedHouseIds: new Set(input.ownedHouseIds ?? []),
  };
}
