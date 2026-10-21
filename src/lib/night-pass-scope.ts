import { redactHouseLocationDetails } from "@/lib/address-reveal";
import { isPoiHouse } from "@/lib/house-kind";
import { isStubHouse, type HouseSet } from "@/lib/house-set";
import { isPracticeHouse } from "@/lib/practice-house";
import { isSchoolCampusAddress } from "@/lib/school-campus";
import type { NightPassViewer, PublicHouse } from "@/lib/types";

type ScopeRow = Pick<
  PublicHouse,
  "id" | "kind" | "address" | "arrival" | "lat" | "lng" | "isPractice"
> & { notes?: string; isStub?: boolean; deviceCacheStub?: boolean };

/** Businesses and school booths — address + arrival are public for everyone. */
export function isPublicTierHouse(house: Pick<ScopeRow, "kind" | "address" | "isPractice">) {
  if (isPracticeHouse(house)) return false;
  if (isPoiHouse(house)) return true;
  return isSchoolCampusAddress(house.address);
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
  /** Homes the viewer cannot see at all (owners without a pass on other homes). */
  hiddenHouseCount: number;
  /** Rehearsal stubs among {@link hiddenHouseCount}. */
  hiddenStubHouseCount: number;
};

/** Teaser count for the house set the viewer's map is showing. */
export function hiddenHouseCountForSet(
  counts: { hiddenHouseCount?: number; hiddenStubHouseCount?: number } | null | undefined,
  set: HouseSet,
): number {
  const total = counts?.hiddenHouseCount ?? 0;
  const stubs = Math.min(counts?.hiddenStubHouseCount ?? 0, total);
  if (set === "all") return total;
  if (set === "stubs") return stubs;
  return total - stubs;
}

/**
 * Night-pass visibility for one viewer. Input rows must be unredacted.
 * - business / school: everything, always
 * - homes: on the map for everyone once entrance codes are on (pins + catalog like pass holders);
 *   full address/arrival/notes only for pass holders after reveal, owners for their row, admin
 */
export function scopeHousesForViewer<T extends ScopeRow>(
  rows: readonly T[],
  ctx: NightPassScopeContext,
): ScopedHouses<T> {
  const seesAllHomes =
    ctx.viewer === "pass" || ctx.viewer === "admin" || ctx.viewer === "public";
  const houses: T[] = [];
  let hiddenHouseCount = 0;
  let hiddenStubHouseCount = 0;
  for (const row of rows) {
    const owned = ctx.ownedIds.has(row.id);
    const detailsOpen =
      owned ||
      ctx.viewer === "admin" ||
      (ctx.viewer === "pass" && ctx.revealed);
    if (isPublicTierHouse(row)) {
      houses.push({ ...row, locationPublic: true });
      continue;
    }
    if (!seesAllHomes && !owned) {
      hiddenHouseCount += 1;
      if (isStubHouse(row)) hiddenStubHouseCount += 1;
      continue;
    }
    houses.push(detailsOpen ? row : redactHouseLocationDetails(row));
  }
  return { houses, hiddenHouseCount, hiddenStubHouseCount };
}
