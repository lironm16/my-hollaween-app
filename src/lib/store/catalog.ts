import { toPublicHouse } from "@/lib/ids";
import { config } from "@/lib/config";
import { pushAlertsEnabled } from "@/lib/push-enabled";
import { isPubliclyListed } from "@/lib/house-state";
import { publicHouseForCatalog } from "@/lib/address-reveal";
import { asCatalogForSnapshot, countPublishedHouses } from "@/lib/catalog-cache-build";
import {
  addressRevealScheduleFromDb,
  catalogEventSettings,
  eventSettingsStamp,
} from "@/lib/event-settings";
import {
  firestoreConfigured,
  queryFirestoreHousesSince,
  queryRemovedHouseIdsSince,
  readCatalogMeta,
  readEventSettingsMeta,
  readFirestoreEventSettings,
  readFirestorePushSettings,
  readPushSettingsMeta,
} from "@/lib/firestore-db";
import type { Catalog, CatalogDelta, DbFile, House, PublicHouse } from "@/lib/types";
import {
  catalogRemovalsSince,
  ensurePushSettingsGeneration,
  getGlobalDb,
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

export function asCatalog(db: Pick<DbFile, "houses" | "updatedAt" | "pushSettings" | "eventSettings">): Catalog {
  return asCatalogForSnapshot(db.houses, db.updatedAt, db.pushSettings, db.eventSettings);
}

export async function getCatalog(): Promise<Catalog> {
  await ensurePushSettingsGeneration();
  const db = await loadDb();
  catalogMem = asCatalog(db);
  return catalogMem;
}

function emptyCatalogDelta(updatedAt: string, houseCount: number): CatalogDelta {
  return {
    updatedAt,
    neighborhood: config.neighborhood,
    houses: [],
    removed: [],
    houseCount,
  };
}

/** Pure gate check for tests — true when client `since` is already up to date. */
export function catalogDeltaGatePassed(input: {
  sinceMs: number;
  catalogUpdatedAt: string;
  pushUpdatedAt?: string;
  eventSettingsUpdatedAt?: string;
  removedIds?: string[];
}) {
  if (input.removedIds?.length) return false;
  if (stamp({ updatedAt: input.catalogUpdatedAt }) > input.sinceMs) return false;
  if (pushAlertsEnabled()) {
    const pushStamp = Date.parse(input.pushUpdatedAt ?? "");
    if (Number.isFinite(pushStamp) && pushStamp > input.sinceMs) return false;
  }
  const eventStamp = Date.parse(input.eventSettingsUpdatedAt ?? "");
  if (Number.isFinite(eventStamp) && eventStamp > input.sinceMs) return false;
  return true;
}

/** Build a catalog delta from the in-memory db (no Firestore house queries). */
export function buildCatalogDeltaFromDb(
  db: DbFile,
  since: string,
  removed: string[] = [],
): CatalogDelta {
  const sinceMs = Date.parse(since);
  const revealSchedule = addressRevealScheduleFromDb(db.eventSettings);
  const houses = db.houses
    .filter((house) => isPubliclyListed(house) && stamp(house) > sinceMs)
    .map((house) =>
      publicHouseForCatalog(toPublicHouse(house) as PublicHouse, new Date(), revealSchedule),
    );
  const pushChanged =
    pushAlertsEnabled() && pushSettingsStamp(db.pushSettings) > sinceMs;
  const eventChanged = eventSettingsStamp(db.eventSettings) > sinceMs;
  return {
    updatedAt: db.updatedAt,
    neighborhood: config.neighborhood,
    houses,
    removed,
    houseCount: countPublishedHouses(db.houses),
    ...(pushChanged ? { pushTemplates: asCatalog(db).pushTemplates } : {}),
    ...(eventChanged ? { eventSettings: asCatalog(db).eventSettings } : {}),
  };
}

/** Firestore incremental delta — changed house docs + removals only (no collection scan). */
export async function buildCatalogDeltaFromFirestore(
  since: string,
  sinceMs: number,
  context: {
    catalogUpdatedAt: string;
    houseCount: number;
    eventSettings?: DbFile["eventSettings"] | null;
    pushSettings?: DbFile["pushSettings"] | null;
  },
): Promise<CatalogDelta> {
  const revealSchedule = addressRevealScheduleFromDb(context.eventSettings ?? undefined);
  const [houseRows, removed] = await Promise.all([
    queryFirestoreHousesSince(since),
    queryRemovedHouseIdsSince(since),
  ]);
  const houses = houseRows.map((house) =>
    publicHouseForCatalog(house, new Date(), revealSchedule),
  );
  const pushChanged =
    pushAlertsEnabled() && pushSettingsStamp(context.pushSettings ?? undefined) > sinceMs;
  const eventChanged = eventSettingsStamp(context.eventSettings ?? undefined) > sinceMs;
  const dbSlice: Pick<DbFile, "houses" | "updatedAt" | "pushSettings" | "eventSettings"> = {
    houses: [],
    updatedAt: context.catalogUpdatedAt,
    ...(context.pushSettings?.templates ? { pushSettings: context.pushSettings } : {}),
    ...(context.eventSettings ? { eventSettings: context.eventSettings } : {}),
  };
  const houseCount = Math.max(context.houseCount, houses.length);
  return {
    updatedAt: context.catalogUpdatedAt,
    neighborhood: config.neighborhood,
    houses,
    removed,
    houseCount,
    ...(pushChanged && context.pushSettings
      ? { pushTemplates: asCatalog(dbSlice).pushTemplates }
      : {}),
    ...(eventChanged && context.eventSettings
      ? { eventSettings: catalogEventSettings(context.eventSettings) }
      : {}),
  };
}

async function resolveAuthoritativeHouseCount(): Promise<number> {
  const mem = getMem();
  if (isMemWarm() && mem) return countPublishedHouses(mem.houses);
  if (catalogMem && typeof catalogMem.houseCount === "number" && catalogMem.houseCount >= 0) {
    return catalogMem.houseCount;
  }
  if (catalogMem?.houses?.length) {
    return catalogMem.houseCount ?? catalogMem.houses.length;
  }
  const global = getGlobalDb();
  if (global?.houses?.length) return countPublishedHouses(global.houses);
  const meta = await readCatalogMeta();
  return meta?.houseCount ?? 0;
}

async function loadDeltaContextForColdPoll(sinceMs: number) {
  const meta = await readCatalogMeta();
  const catalogUpdatedAt = meta?.updatedAt ?? new Date(0).toISOString();
  const houseCount = await resolveAuthoritativeHouseCount();
  const mem = getMem();
  const global = getGlobalDb();

  let eventSettings = mem?.eventSettings ?? global?.eventSettings ?? null;
  const eventMeta = await readEventSettingsMeta();
  const eventStamp = eventSettingsStamp(eventSettings ?? undefined);
  const remoteEventStamp = eventMeta?.updatedAt ? Date.parse(eventMeta.updatedAt) : 0;
  if (remoteEventStamp > sinceMs && remoteEventStamp > eventStamp) {
    eventSettings = (await readFirestoreEventSettings()) ?? eventSettings;
  }

  let pushSettings = mem?.pushSettings ?? global?.pushSettings ?? null;
  if (pushAlertsEnabled()) {
    const pushMeta = await readPushSettingsMeta();
    const pushStamp = pushSettingsStamp(pushSettings ?? undefined);
    const remotePushStamp = pushMeta?.updatedAt ? Date.parse(pushMeta.updatedAt) : 0;
    if (remotePushStamp > sinceMs && remotePushStamp > pushStamp) {
      pushSettings = (await readFirestorePushSettings()) ?? pushSettings;
    }
  }

  return { catalogUpdatedAt, houseCount, eventSettings, pushSettings };
}

/** Instance tombstones + Firestore `removed` docs — every poll path must use both. */
export function mergeCatalogRemovalIds(local: string[], remote: string[]): string[] {
  const ids = new Set<string>();
  for (const id of local) {
    if (id) ids.add(id);
  }
  for (const id of remote) {
    if (id) ids.add(id);
  }
  return [...ids];
}

async function catalogRemovalsForDelta(since: string, sinceMs: number): Promise<string[]> {
  const local = firestoreConfigured() ? catalogRemovalsSince(sinceMs) : [];
  if (!firestoreConfigured()) return local;
  const remote = await queryRemovedHouseIdsSince(since);
  return mergeCatalogRemovalIds(local, remote);
}

async function tryCatalogDeltaGate(since: string, sinceMs: number): Promise<CatalogDelta | null> {
  const mem = getMem();
  const eventMeta = firestoreConfigured() ? await readEventSettingsMeta() : null;
  const eventSettingsUpdatedAt = mem?.eventSettings?.updatedAt ?? eventMeta?.updatedAt;
  const removedForSince = firestoreConfigured() ? await catalogRemovalsForDelta(since, sinceMs) : [];

  if (isMemWarm() && mem) {
    if (removedForSince.length > 0) return null;
    if (firestoreConfigured()) {
      const meta = await readCatalogMeta();
      if (meta?.updatedAt && stamp({ updatedAt: meta.updatedAt }) > sinceMs) return null;
    }
    if (
      catalogDeltaGatePassed({
        sinceMs,
        catalogUpdatedAt: mem.updatedAt,
        pushUpdatedAt: mem.pushSettings?.updatedAt,
        eventSettingsUpdatedAt,
        removedIds: [],
      })
    ) {
      return emptyCatalogDelta(
        mem.updatedAt,
        catalogMem?.houseCount ?? countPublishedHouses(mem.houses),
      );
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
    if (meta?.updatedAt && !memAheadOfMeta) {
      if (
        catalogDeltaGatePassed({
          sinceMs,
          catalogUpdatedAt: meta.updatedAt,
          pushUpdatedAt: pushMeta?.updatedAt,
          eventSettingsUpdatedAt,
          removedIds: removedForSince,
        })
      ) {
        return emptyCatalogDelta(meta.updatedAt, await resolveAuthoritativeHouseCount());
      }
    }
  }

  return null;
}

export async function getCatalogDelta(since: string): Promise<CatalogDelta> {
  const sinceMs = Date.parse(since);
  if (!Number.isFinite(sinceMs) || sinceMs <= 0) {
    const full = await getCatalog();
    return { ...full, full: true };
  }

  const gated = await tryCatalogDeltaGate(since, sinceMs);
  if (gated) return gated;

  const mem = getMem();
  if (isMemWarm() && mem) {
    const removed = await catalogRemovalsForDelta(since, sinceMs);
    return buildCatalogDeltaFromDb(mem, since, removed);
  }

  if (firestoreConfigured()) {
    const context = await loadDeltaContextForColdPoll(sinceMs);
    return buildCatalogDeltaFromFirestore(since, sinceMs, context);
  }

  const db = await loadDb();
  return buildCatalogDeltaFromDb(db, since, []);
}
