import type { Catalog, CatalogDelta, DbFile, PublicHouse, PushSubscriptionRecord } from "@/lib/types";
import { isAuthoritativeHouseList } from "@/lib/catalog-houses";
import { loadDeletedHouseIds } from "@/lib/deleted-houses";
import { config } from "@/lib/config";

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
  };
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
export function syncCatalog(prev: Catalog | null, incoming: Catalog): Catalog {
  const next = normalizeCatalogDelta(incoming);
  if (!prev) return next;
  const prevTs = stamp(prev);
  const nextTs = stamp(next);
  const byId = new Map<string, PublicHouse>();
  const take = (house: PublicHouse) => {
    const current = byId.get(house.id);
    if (!current || stamp(house) >= stamp(current)) byId.set(house.id, house);
  };

  if (nextTs >= prevTs) {
    next.houses.forEach(take);
    if (!isAuthoritativeHouseList(next)) {
      const deleted = new Set(loadDeletedHouseIds());
      for (const house of prev.houses) {
        if (deleted.has(house.id)) continue;
        if (!byId.has(house.id)) take(house);
      }
    }
    return {
      ...next,
      houses: [...byId.values()],
      houseCount: next.houseCount ?? prev.houseCount,
      eventSettings: next.eventSettings ?? prev.eventSettings,
    };
  }

  prev.houses.forEach(take);
  next.houses.forEach(take);
  return {
    ...prev,
    houses: [...byId.values()],
    houseCount: next.houseCount ?? prev.houseCount,
    eventSettings: next.eventSettings ?? prev.eventSettings,
  };
}

/** Apply a delta poll (`?since=`) onto the catalog already on the device. */
export function mergeCatalogDelta(prev: Catalog | null, incoming: CatalogDelta): Catalog {
  const delta = normalizeCatalogDelta(incoming);
  if (!prev) {
    return {
      updatedAt: delta.updatedAt,
      neighborhood: delta.neighborhood,
      houses: delta.houses,
      houseCount: delta.houseCount,
      pushTemplates: delta.pushTemplates,
      eventSettings: delta.eventSettings,
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
    });
  }
  const byId = new Map(prev.houses.map((house) => [house.id, house]));
  for (const id of delta.removed ?? []) byId.delete(id);
  for (const house of delta.houses) {
    const current = byId.get(house.id);
    if (!current || stamp(house) >= stamp(current)) byId.set(house.id, house);
  }
  const houses = [...byId.values()];
  const mergedLen = houses.length;
  let houseCount = delta.houseCount ?? prev.houseCount;
  if (typeof houseCount === "number" && houseCount < mergedLen) {
    houseCount = Math.max(prev.houseCount ?? 0, mergedLen);
  }
  return {
    updatedAt: delta.updatedAt,
    neighborhood: delta.neighborhood || prev.neighborhood,
    houses,
    houseCount,
    pushTemplates: delta.pushTemplates ?? prev.pushTemplates,
    eventSettings: delta.eventSettings ?? prev.eventSettings,
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
        }
      : undefined,
  };
}
