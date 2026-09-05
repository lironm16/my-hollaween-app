import type { Catalog, DbFile, House, PublicHouse } from "@/lib/types";

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
  if (!prev) return incoming;
  const prevTs = stamp(prev);
  const nextTs = stamp(incoming);
  const byId = new Map<string, PublicHouse>();
  const take = (house: PublicHouse) => {
    const current = byId.get(house.id);
    if (!current || stamp(house) >= stamp(current)) byId.set(house.id, house);
  };

  if (nextTs >= prevTs) {
    incoming.houses.forEach(take);
    for (const house of prev.houses) {
      if (!byId.has(house.id) && stamp(house) >= nextTs) take(house);
    }
    return { ...incoming, houses: [...byId.values()] };
  }

  prev.houses.forEach(take);
  incoming.houses.forEach(take);
  return { ...prev, houses: [...byId.values()] };
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
  };
}
