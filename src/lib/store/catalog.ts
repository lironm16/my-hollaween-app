import { toPublicHouse } from "@/lib/ids";
import { config } from "@/lib/config";
import { pushAlertsEnabled } from "@/lib/push-enabled";
import { isPubliclyListed } from "@/lib/house-state";
import { asCatalogForSnapshot } from "@/lib/catalog-cache-build";
import {
  firestoreConfigured,
  queryRemovedHouseIdsSince,
  readCatalogMeta,
  readPushSettingsMeta,
} from "@/lib/firestore-db";
import type { Catalog, CatalogDelta, DbFile, House, PublicHouse } from "@/lib/types";
import {
  catalogRemovalsSince,
  ensurePushSettingsGeneration,
  getMem,
  isMemWarm,
  loadDb,
  pushSettingsStamp,
  registerCatalogRemoval,
  registerOnMemSetHook,
  stamp,
} from "./core";

let catalogMem: Catalog | null = null;
registerOnMemSetHook(() => {
  catalogMem = null;
});

/** Tombstone deletes on this instance so warm delta polls skip Firestore. */
export function recordCatalogRemoval(id: string, deletedAt = new Date().toISOString()) {
  registerCatalogRemoval(id, deletedAt);
}

/** Used by warm delta polls; exported for tests. */
export function catalogRemovalsSinceIso(since: string) {
  const sinceMs = Date.parse(since);
  if (!Number.isFinite(sinceMs)) return [];
  return catalogRemovalsSince(sinceMs);
}

export function asCatalog(
  houses: House[],
  updatedAt: string,
  pushSettings?: DbFile["pushSettings"],
): Catalog {
  return asCatalogForSnapshot(houses, updatedAt, pushSettings);
}

export async function getCatalog(): Promise<Catalog> {
  await ensurePushSettingsGeneration();
  const db = await loadDb();
  catalogMem = asCatalog(db.houses, db.updatedAt, db.pushSettings);
  return catalogMem;
}

function emptyCatalogDelta(updatedAt: string): CatalogDelta {
  return {
    updatedAt,
    neighborhood: config.neighborhood,
    houses: [],
    removed: [],
  };
}

/** Pure gate check for tests — true when client `since` is already up to date. */
export function catalogDeltaGatePassed(input: {
  sinceMs: number;
  catalogUpdatedAt: string;
  pushUpdatedAt?: string;
  removedIds?: string[];
}) {
  if (input.removedIds?.length) return false;
  if (stamp({ updatedAt: input.catalogUpdatedAt }) > input.sinceMs) return false;
  if (pushAlertsEnabled()) {
    const pushStamp = Date.parse(input.pushUpdatedAt ?? "");
    if (Number.isFinite(pushStamp) && pushStamp > input.sinceMs) return false;
  }
  return true;
}

/** Build a catalog delta from the in-memory db (no Firestore house queries). */
export function buildCatalogDeltaFromDb(
  db: DbFile,
  since: string,
  removed: string[] = [],
): CatalogDelta {
  const sinceMs = Date.parse(since);
  const houses = db.houses
    .filter((house) => isPubliclyListed(house) && stamp(house) > sinceMs)
    .map((house) => toPublicHouse(house) as PublicHouse);
  const pushChanged =
    pushAlertsEnabled() && pushSettingsStamp(db.pushSettings) > sinceMs;
  return {
    updatedAt: db.updatedAt,
    neighborhood: config.neighborhood,
    houses,
    removed,
    ...(pushChanged
      ? { pushTemplates: asCatalog(db.houses, db.updatedAt, db.pushSettings).pushTemplates }
      : {}),
  };
}

async function tryCatalogDeltaGate(since: string, sinceMs: number): Promise<CatalogDelta | null> {
  const mem = getMem();
  if (isMemWarm() && mem) {
    const removed = firestoreConfigured() ? catalogRemovalsSince(sinceMs) : [];
    if (
      catalogDeltaGatePassed({
        sinceMs,
        catalogUpdatedAt: mem.updatedAt,
        pushUpdatedAt: mem.pushSettings?.updatedAt,
        removedIds: removed,
      })
    ) {
      return emptyCatalogDelta(mem.updatedAt);
    }
  }

  if (firestoreConfigured()) {
    const meta = await readCatalogMeta();
    const pushMeta = pushAlertsEnabled() ? await readPushSettingsMeta() : null;
    const memAheadOfMeta =
      isMemWarm() &&
      mem &&
      meta?.updatedAt &&
      stamp(mem) > stamp({ updatedAt: meta.updatedAt });
    if (
      meta?.updatedAt &&
      !memAheadOfMeta &&
      catalogDeltaGatePassed({
        sinceMs,
        catalogUpdatedAt: meta.updatedAt,
        pushUpdatedAt: pushMeta?.updatedAt,
        removedIds: [],
      })
    ) {
      const removed = isMemWarm()
        ? catalogRemovalsSince(sinceMs)
        : await queryRemovedHouseIdsSince(since);
      if (
        catalogDeltaGatePassed({
          sinceMs,
          catalogUpdatedAt: meta.updatedAt,
          pushUpdatedAt: pushMeta?.updatedAt,
          removedIds: removed,
        })
      ) {
        return emptyCatalogDelta(meta.updatedAt);
      }
    }
  }

  return null;
}

export async function getCatalogDelta(since: string): Promise<CatalogDelta> {
  if (pushAlertsEnabled()) await ensurePushSettingsGeneration();
  const sinceMs = Date.parse(since);
  if (!Number.isFinite(sinceMs) || sinceMs <= 0) {
    const full = await getCatalog();
    return { ...full, full: true };
  }

  const gated = await tryCatalogDeltaGate(since, sinceMs);
  if (gated) return gated;

  const warm = isMemWarm();
  const db = await loadDb();

  let removed: string[] = [];
  if (firestoreConfigured()) {
    removed = warm ? catalogRemovalsSince(sinceMs) : await queryRemovedHouseIdsSince(since);
  }

  return buildCatalogDeltaFromDb(db, since, removed);
}
