import type { Catalog, CatalogDelta, DbFile, PublicHouse, PushSubscriptionRecord } from "@/lib/types";
import { isAuthoritativeHouseList } from "@/lib/catalog-houses";
import { mergeCatalogHouseRow } from "@/lib/catalog-stub-flags";
import { loadDeletedHouseIds } from "@/lib/deleted-houses";
import { loadServerRemovedHouseIds } from "@/lib/server-removed-houses";
import { config } from "@/lib/config";

export type SyncCatalogOptions = {
  /**
   * Live full catalog (`GET /api/catalog` or `delta.full`) — inline list may replace local ids.
   * Snapshots and CDN bundles must omit this so stale shorter lists cannot drop rows.
   */
  trustedCompleteList?: boolean;
};

/** Deleted on this device or explicitly reported deleted by the live server. */
export function loadHiddenHouseIds(): Set<string> {
  return new Set([...loadDeletedHouseIds(), ...loadServerRemovedHouseIds()]);
}

function withoutHiddenHouses<T extends { id: string }>(houses: T[], hidden: Set<string>): T[] {
  if (hidden.size === 0) return houses;
  return houses.filter((house) => !hidden.has(house.id));
}

function preserveLocalHousesFromPrev(
  prev: Catalog,
  take: (house: PublicHouse) => void,
) {
  for (const house of prev.houses) take(house);
}

/** Night-pass teaser counts — carried together so the stub share never outlives its total. */
export function hiddenCountFields(
  source: Pick<Catalog, "hiddenHouseCount" | "hiddenStubHouseCount"> | null | undefined,
): Pick<Catalog, "hiddenHouseCount" | "hiddenStubHouseCount"> {
  if (typeof source?.hiddenHouseCount !== "number") return {};
  return {
    hiddenHouseCount: source.hiddenHouseCount,
    ...(typeof source.hiddenStubHouseCount === "number"
      ? { hiddenStubHouseCount: source.hiddenStubHouseCount }
      : {}),
  };
}

/** API / CDN payloads must always expose houses[] — delta polls omit the key when unchanged. */
export function normalizeCatalogDelta(raw: unknown): CatalogDelta {
  const o = raw && typeof raw === "object" ? (raw as Partial<CatalogDelta>) : {};
  return {
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : "",
    neighborhood:
      typeof o.neighborhood === "string" ? o.neighborhood : config.neighborhood,
    houses: Array.isArray(o.houses) ? o.houses : [],
    houseCount: typeof o.houseCount === "number" ? o.houseCount : undefined,
    removed: Array.isArray(o.removed) ? o.removed : undefined,
    full: o.full === true ? true : undefined,
    pollSeconds: typeof o.pollSeconds === "number" ? o.pollSeconds : undefined,
    pushTemplates: o.pushTemplates,
    eventSettings: o.eventSettings,
    ...(typeof o.scope === "string" ? { scope: o.scope } : {}),
    ...hiddenCountFields(o),
  };
}

/** Audience a house list was built for — payloads without `scope` are the legacy full list. */
export function catalogScopeOf(catalog: Pick<Catalog, "scope"> | null | undefined): string {
  return catalog?.scope ?? "legacy";
}

function stamp(value: { updatedAt: string }) {
  const n = Date.parse(value.updatedAt);
  return Number.isFinite(n) ? n : 0;
}

/** Keep every house across overlapping writes. Newer `updatedAt` wins per id. */
export function mergeHouses<T extends { id: string; updatedAt: string }>(
  latest: T[],
  incoming: T[],
): T[] {
  const byId = new Map<string, T>();
  for (const house of latest) byId.set(house.id, house);
  for (const house of incoming) {
    const current = byId.get(house.id);
    if (!current || stamp(house) >= stamp(current)) byId.set(house.id, house);
  }
  return [...byId.values()];
}

/**
 * Fold a fetched catalog into what the phone already shows.
 * A stale CDN copy cannot drop a house that was just published.
 */
export function syncCatalog(
  prev: Catalog | null,
  incoming: Catalog,
  options?: SyncCatalogOptions,
): Catalog {
  const next = normalizeCatalogDelta(incoming);
  if (!prev) return next;
  // Lists built for different audiences must never union, or a smaller night-pass list keeps the
  // homes from the old full one.
  if (catalogScopeOf(prev) !== catalogScopeOf(next)) return next;
  const prevTs = stamp(prev);
  const nextTs = stamp(next);
  const byId = new Map<string, PublicHouse>();
  const take = (house: PublicHouse) => {
    byId.set(house.id, mergeCatalogHouseRow(byId.get(house.id), house));
  };

  const allowAuthoritativeDrop =
    Boolean(options?.trustedCompleteList) && isAuthoritativeHouseList(next);

  const hidden = loadHiddenHouseIds();
  if (nextTs >= prevTs) {
    next.houses.forEach(take);
    if (!allowAuthoritativeDrop) {
      preserveLocalHousesFromPrev(prev, take);
    }
    return {
      ...next,
      houses: withoutHiddenHouses([...byId.values()], hidden),
      houseCount: next.houseCount ?? prev.houseCount,
      eventSettings: next.eventSettings ?? prev.eventSettings,
    };
  }

  prev.houses.forEach(take);
  next.houses.forEach(take);
  return {
    ...prev,
    houses: withoutHiddenHouses([...byId.values()], hidden),
    houseCount: next.houseCount ?? prev.houseCount,
    eventSettings: next.eventSettings ?? prev.eventSettings,
  };
}

/** Apply a delta poll (`?since=`) onto the catalog already on the device. */
export function mergeCatalogDelta(prev: Catalog | null, incoming: CatalogDelta): Catalog {
  const delta = normalizeCatalogDelta(incoming);
  if (!prev || catalogScopeOf(prev) !== catalogScopeOf(delta)) {
    return {
      updatedAt: delta.updatedAt,
      neighborhood: delta.neighborhood,
      houses: delta.houses,
      houseCount: delta.houseCount,
      pushTemplates: delta.pushTemplates,
      eventSettings: delta.eventSettings,
      ...(delta.scope ? { scope: delta.scope } : {}),
      ...hiddenCountFields(delta),
    };
  }
  if (delta.full) {
    return syncCatalog(prev, {
      updatedAt: delta.updatedAt,
      neighborhood: delta.neighborhood,
      houses: delta.houses,
      houseCount: delta.houseCount,
      pushTemplates: delta.pushTemplates ?? prev.pushTemplates,
      eventSettings: delta.eventSettings ?? prev.eventSettings,
      ...(delta.scope ? { scope: delta.scope } : {}),
      ...hiddenCountFields(delta),
    });
  }
  const byId = new Map(prev.houses.map((house) => [house.id, house]));
  for (const id of delta.removed ?? []) byId.delete(id);
  for (const house of delta.houses) {
    byId.set(house.id, mergeCatalogHouseRow(byId.get(house.id), house));
  }
  const houses = withoutHiddenHouses([...byId.values()], loadHiddenHouseIds());
  const mergedLen = houses.length;
  let houseCount = delta.houseCount ?? prev.houseCount;
  if (typeof houseCount === "number" && houseCount < mergedLen) {
    houseCount = Math.max(prev.houseCount ?? 0, mergedLen);
  }
  const scope = delta.scope ?? prev.scope;
  const hidden = hiddenCountFields(typeof delta.hiddenHouseCount === "number" ? delta : prev);
  return {
    updatedAt: delta.updatedAt,
    neighborhood: delta.neighborhood || prev.neighborhood,
    houses,
    houseCount,
    pushTemplates: delta.pushTemplates ?? prev.pushTemplates,
    eventSettings: delta.eventSettings ?? prev.eventSettings,
    ...(scope ? { scope } : {}),
    ...hidden,
  };
}

/** Same endpoint keeps the newer record. Used so a subscribe is not dropped by a same-stamp house write. */
export function mergePushSubscriptions(
  ...lists: Array<PushSubscriptionRecord[] | undefined>
): PushSubscriptionRecord[] {
  const byEndpoint = new Map<string, PushSubscriptionRecord>();
  for (const list of lists) {
    for (const item of list ?? []) {
      if (!item?.endpoint) continue;
      const current = byEndpoint.get(item.endpoint);
      const nextStamp = Date.parse(item.createdAt);
      const currentStamp = current ? Date.parse(current.createdAt) : -1;
      if (!current || (Number.isFinite(nextStamp) && nextStamp >= currentStamp)) {
        byEndpoint.set(item.endpoint, item);
      }
    }
  }
  return [...byEndpoint.values()];
}

export function cloneDb(db: DbFile): DbFile {
  return {
    updatedAt: db.updatedAt,
    houses: db.houses.map((house) => ({
      ...house,
      treats: [...house.treats],
      treatStock: { ...house.treatStock },
    })),
    vapid: db.vapid ? { ...db.vapid } : undefined,
    pushSubscriptions: db.pushSubscriptions?.map((item) => ({
      endpoint: item.endpoint,
      createdAt: item.createdAt,
      keys: { ...item.keys },
      ...(item.topics !== undefined ? { topics: [...item.topics] } : {}),
    })),
    pushSettings: db.pushSettings
      ? {
          updatedAt: db.pushSettings.updatedAt,
          templates: Object.fromEntries(
            Object.entries(db.pushSettings.templates ?? {}).map(([id, fields]) => [id, { ...fields }]),
          ),
        }
      : undefined,
    eventSettings: db.eventSettings
      ? {
          updatedAt: db.eventSettings.updatedAt,
          ...(db.eventSettings.addressReveal
            ? { addressReveal: { ...db.eventSettings.addressReveal } }
            : {}),
          ...(db.eventSettings.addHouseCutoff
            ? { addHouseCutoff: { ...db.eventSettings.addHouseCutoff } }
            : {}),
          ...(db.eventSettings.gemHuntPublic === true ? { gemHuntPublic: true as const } : {}),
          ...(db.eventSettings.countdownBanner === false ? { countdownBanner: false as const } : {}),
        }
      : undefined,
  };
}
