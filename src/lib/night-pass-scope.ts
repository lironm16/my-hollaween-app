import { clusterAddressKey, clusterCoordKey } from "@/lib/house-clusters";
import { isPoiHouse } from "@/lib/house-kind";
import { isPracticeHouse } from "@/lib/practice-house";
import { isSchoolCampusAddress } from "@/lib/school-campus";
import type { NightPassViewer, PublicHouse } from "@/lib/types";

type ScopeRow = Pick<
  PublicHouse,
  "id" | "kind" | "address" | "arrival" | "lat" | "lng" | "isPractice"
>;

/** Businesses and school booths — address + arrival are public for everyone. */
export function isPublicTierHouse(house: Pick<ScopeRow, "kind" | "address" | "isPractice">) {
  if (isPracticeHouse(house)) return false;
  if (isPoiHouse(house)) return true;
  return isSchoolCampusAddress(house.address);
}

function locationKeys(house: Pick<ScopeRow, "address" | "lat" | "lng">): string[] {
  const keys: string[] = [];
  if (Number.isFinite(house.lat) && Number.isFinite(house.lng)) {
    keys.push(clusterCoordKey(house.lat, house.lng));
  }
  const address = house.address?.trim();
  if (address) keys.push(`addr:${clusterAddressKey(address)}`);
  return keys;
}

/** Pin / address keys of every public-tier row — homes sharing one become publicly located. */
export function publicLocationKeys(houses: readonly ScopeRow[]): Set<string> {
  const keys = new Set<string>();
  for (const house of houses) {
    if (!isPublicTierHouse(house)) continue;
    for (const key of locationKeys(house)) keys.add(key);
  }
  return keys;
}

export function sharesPublicLocation(house: ScopeRow, keys: ReadonlySet<string>) {
  return locationKeys(house).some((key) => keys.has(key));
}

export type NightPassScopeContext = {
  viewer: Exclude<NightPassViewer, "legacy">;
  /** Event reveal time reached (server clock, admin override applied). */
  revealed: boolean;
  /** Houses this device owns (hw_owner cookie). */
  ownedIds: ReadonlySet<string>;
};

/** Unregistered visitor — what shared / CDN-cached payloads are built for. */
export const PUBLIC_NIGHT_PASS_SCOPE: NightPassScopeContext = {
  viewer: "public",
  revealed: false,
  ownedIds: new Set(),
};

export type ScopedHouses<T> = {
  houses: T[];
  /** Homes the viewer cannot see at all (public visitors only). */
  hiddenHouseCount: number;
};

/**
 * Night-pass visibility for one viewer. Input rows must be unredacted.
 * - business / school: everything, always
 * - homes (even in a business's building): never sent to public visitors; pass holders + admin
 *   see them all (address/arrival after reveal), owners see their own
 * - home sharing a pin with a business: address open to whoever receives it; arrival stays private
 */
export function scopeHousesForViewer<T extends ScopeRow>(
  rows: readonly T[],
  ctx: NightPassScopeContext,
): ScopedHouses<T> {
  const keys = publicLocationKeys(rows);
  const seesAllHomes = ctx.viewer === "pass" || ctx.viewer === "admin";
  const houses: T[] = [];
  let hiddenHouseCount = 0;
  for (const row of rows) {
    const owned = ctx.ownedIds.has(row.id);
    const detailsOpen = owned || ctx.viewer === "admin" || (seesAllHomes && ctx.revealed);
    if (isPublicTierHouse(row)) {
      houses.push({ ...row, locationPublic: true });
      continue;
    }
    if (!seesAllHomes && !owned) {
      hiddenHouseCount += 1;
      continue;
    }
    if (sharesPublicLocation(row, keys)) {
      houses.push({
        ...row,
        locationPublic: true,
        arrival: detailsOpen ? row.arrival : "",
      });
      continue;
    }
    houses.push(detailsOpen ? row : { ...row, address: "", arrival: "" });
  }
  return { houses, hiddenHouseCount };
}
