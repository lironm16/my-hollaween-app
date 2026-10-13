import { addressRevealTime } from "@/lib/address-reveal";
import { isPubliclyListed } from "@/lib/house-state";
import { toPublicHouse } from "@/lib/ids";
import { scopeHousesForViewer, type NightPassScopeContext } from "@/lib/night-pass-scope";
import { getCatalog, getCatalogDelta, loadAddressRevealSchedule } from "@/lib/store";
import { loadDb } from "@/lib/store/core";
import type { CatalogDelta, House, PublicHouse } from "@/lib/types";

function stamp(value?: string) {
  const n = Date.parse(value ?? "");
  return Number.isFinite(n) ? n : 0;
}

/**
 * Bump whenever {@link scopeHousesForViewer} changes what a viewer receives: devices that synced
 * earlier get one full catalog instead of a delta that would keep their stale rows.
 */
export const NIGHT_PASS_SCOPE_RULES_AT = "2026-10-12T10:15:00.000Z";

/** Unredacted, publicly listed rows for one viewer. */
export async function scopedHousesFromDb(ctx: NightPassScopeContext) {
  const db = await loadDb();
  const rows = db.houses
    .filter((house: House) => isPubliclyListed(house))
    .map((house) => toPublicHouse(house) as PublicHouse);
  return scopeHousesForViewer(rows, ctx);
}

/**
 * Catalog (or `since` delta) for a night-pass viewer. Same envelope as `/api/catalog` so the
 * client sync pipeline is unchanged; only the rows and counts differ.
 */
export async function nightPassCatalog(
  ctx: NightPassScopeContext,
  since?: string | null,
): Promise<CatalogDelta> {
  const scoped = await scopedHousesFromDb(ctx);
  const byId = new Map(scoped.houses.map((house) => [house.id, house]));

  // Reveal and scope-rule changes flip rows without touching them — move `since` past both once.
  let revealIso = NIGHT_PASS_SCOPE_RULES_AT;
  if (ctx.revealed && ctx.viewer !== "public") {
    const revealAt = addressRevealTime(await loadAddressRevealSchedule()).toISOString();
    if (stamp(revealAt) > stamp(revealIso)) revealIso = revealAt;
  }
  const sinceMs = stamp(since ?? undefined);
  const wantsDelta = Boolean(since) && sinceMs > 0 && sinceMs >= stamp(revealIso);

  const base: CatalogDelta = wantsDelta ? await getCatalogDelta(since!) : { ...(await getCatalog()) };
  const houses =
    wantsDelta && !base.full
      ? base.houses.flatMap((house) => {
          const row = byId.get(house.id);
          return row ? [row] : [];
        })
      : scoped.houses;
  const updatedAt = stamp(revealIso) > stamp(base.updatedAt) ? revealIso : base.updatedAt;
  // A row that changed out of this viewer's scope (e.g. business → home) must leave the device.
  const outOfScope =
    wantsDelta && !base.full ? base.houses.filter((house) => !byId.has(house.id)).map((h) => h.id) : [];
  const removed = [...new Set([...(base.removed ?? []), ...outOfScope])];

  return {
    ...base,
    updatedAt,
    houses,
    ...(removed.length ? { removed } : {}),
    houseCount: scoped.houses.length,
    ...(wantsDelta && !base.full ? {} : { full: true }),
    scope: ctx.viewer,
    hiddenHouseCount: scoped.hiddenHouseCount,
    hiddenStubHouseCount: scoped.hiddenStubHouseCount,
  };
}
