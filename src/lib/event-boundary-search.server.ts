import type { BoundarySearchHit } from "@/lib/event-boundary";
import { zoneKeyCity, zoneKeyNeighborhood, zoneKeyStreet } from "@/lib/event-boundary";
import { searchStreets, searchStreetsNationwide } from "@/lib/event-boundary-nominatim.server";
import type { GovNeighborhoodCatalog } from "@/lib/gov-neighborhoods/types";
import {
  searchCatalog,
  uniqueCitiesFromCatalog,
} from "@/lib/gov-neighborhoods/load.server";

const KIND_RANK: Record<BoundarySearchHit["kind"], number> = {
  city: 0,
  neighborhood: 1,
  street: 2,
};

export function inferSettlementFromQuery(
  catalog: GovNeighborhoodCatalog,
  q: string,
): { settlement?: string; nameQuery: string } {
  const trimmed = q.trim();
  if (!trimmed) return { nameQuery: "" };

  const cities = uniqueCitiesFromCatalog(catalog, undefined, 4000);
  const sorted = [...cities].sort((a, b) => b.length - a.length);
  for (const city of sorted) {
    if (trimmed.includes(city)) {
      const nameQuery = trimmed.replace(city, "").replace(/\s+/g, " ").trim();
      return { settlement: city, nameQuery: nameQuery || trimmed };
    }
  }
  return { nameQuery: trimmed };
}

export async function unifiedBoundarySearch(
  catalog: GovNeighborhoodCatalog,
  q: string,
  limit = 28,
): Promise<BoundarySearchHit[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];

  const { settlement, nameQuery } = inferSettlementFromQuery(catalog, trimmed);
  const hoodNeedle = settlement ? nameQuery || undefined : trimmed;

  const hits: BoundarySearchHit[] = [];

  for (const c of uniqueCitiesFromCatalog(catalog, trimmed, 10)) {
    hits.push({
      kind: "city",
      id: zoneKeyCity(c),
      label: c,
      city: c,
      subtitle: "עיר שלמה",
    });
  }

  for (const e of searchCatalog(catalog, {
    city: settlement,
    q: hoodNeedle ?? (settlement ? undefined : trimmed),
    limit: settlement ? (hoodNeedle ? 24 : 14) : 18,
  })) {
    hits.push({
      kind: "neighborhood",
      id: zoneKeyNeighborhood(e.id),
      label: e.name,
      city: e.city,
      subtitle: e.city,
    });
  }

  try {
    const streets = settlement
      ? await searchStreets(settlement, hoodNeedle ?? settlement, 12)
      : await searchStreetsNationwide(trimmed, 10);
    for (const s of streets) {
      hits.push({
        kind: "street",
        id: zoneKeyStreet(s.city, s.street),
        label: s.street,
        city: s.city,
        subtitle: s.city,
      });
    }
  } catch {
    // streets optional when nominatim throttles
  }

  const seen = new Set<string>();
  const deduped: BoundarySearchHit[] = [];
  for (const h of hits) {
    if (seen.has(h.id)) continue;
    seen.add(h.id);
    deduped.push(h);
  }

  deduped.sort((a, b) => {
    const r = KIND_RANK[a.kind] - KIND_RANK[b.kind];
    if (r !== 0) return r;
    return a.label.localeCompare(b.label, "he");
  });

  return deduped.slice(0, limit);
}
