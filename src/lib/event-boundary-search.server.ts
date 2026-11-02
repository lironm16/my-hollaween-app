import { parsePointAddressQuery } from "@/lib/event-boundary-address-parse";
import type { BoundarySearchHit, EventBoundaryKind } from "@/lib/event-boundary";
import { queryEligibleForPointSearch, zoneKeyCity, zoneKeyNeighborhood, zoneKeyStreet } from "@/lib/event-boundary";
import {
  searchAddressPoints,
  searchStreets,
  searchStreetsNationwide,
} from "@/lib/event-boundary-nominatim.server";
import type { GovNeighborhoodCatalog } from "@/lib/gov-neighborhoods/types";
import {
  searchCatalog,
  uniqueCitiesFromCatalog,
} from "@/lib/gov-neighborhoods/load.server";

const KIND_RANK: Record<BoundarySearchHit["kind"], number> = {
  city: 0,
  neighborhood: 1,
  street: 2,
  point: 3,
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
  filterKind?: EventBoundaryKind,
): Promise<BoundarySearchHit[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];

  if (filterKind === "point") {
    try {
      const points = await searchAddressPoints(trimmed, limit);
      return points.map((p) => ({
        kind: "point" as const,
        id: p.id,
        label: p.label,
        city: p.city,
        subtitle: p.city,
        lat: p.lat,
        lng: p.lng,
      }));
    } catch {
      return [];
    }
  }

  const { settlement, nameQuery } = inferSettlementFromQuery(catalog, trimmed);
  const hoodNeedle = settlement ? nameQuery || undefined : trimmed;

  const hits: BoundarySearchHit[] = [];

  if (filterKind && filterKind !== "city" && filterKind !== "neighborhood" && filterKind !== "street") {
    return [];
  }

  if (!filterKind || filterKind === "city") {
  for (const c of uniqueCitiesFromCatalog(catalog, trimmed, 10)) {
    hits.push({
      kind: "city",
      id: zoneKeyCity(c),
      label: c,
      city: c,
      subtitle: "עיר שלמה",
    });
  }
  }

  const hasHouseNumber = queryEligibleForPointSearch(trimmed);
  const parsedAddress = hasHouseNumber ? parsePointAddressQuery(trimmed) : null;

  if (!filterKind && hasHouseNumber) {
    try {
      const points = await searchAddressPoints(trimmed, Math.min(limit, 14));
      for (const p of points) {
        hits.push({
          kind: "point",
          id: p.id,
          label: p.label,
          city: p.city,
          subtitle: p.city,
          lat: p.lat,
          lng: p.lng,
        });
      }
    } catch {
      // nominatim optional
    }
  }

  if (!filterKind || filterKind === "neighborhood") {
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
  }

  if (!filterKind || filterKind === "street") {
    try {
      // Unified search with a parsed address (street + number + city) → נקודה hits, not רחוב.
      if (!filterKind && parsedAddress) {
        // skip street rows
      } else if (hasHouseNumber && !parsedAddress && !settlement) {
        // "נחליאלי 4" without a city is an address, not a nationwide street pick.
      } else {
        const streetNeedle = parsedAddress?.street ?? hoodNeedle ?? trimmed;
        const streetCity = parsedAddress?.city ?? settlement;

        const streets = streetCity
          ? await searchStreets(streetCity, streetNeedle, 12)
          : await searchStreetsNationwide(
              streetNeedle.replace(/\d+[א-ת]?/g, " ").replace(/\s+/g, " ").trim(),
              10,
            );

        for (const s of streets) {
          hits.push({
            kind: "street",
            id: zoneKeyStreet(s.city, s.street),
            label: s.street,
            city: s.city,
            subtitle: s.city,
          });
        }
      }
    } catch {
      // streets optional when nominatim throttles
    }
  }

  const seen = new Set<string>();
  const deduped: BoundarySearchHit[] = [];
  for (const h of hits) {
    if (seen.has(h.id)) continue;
    seen.add(h.id);
    deduped.push(h);
  }

  deduped.sort((a, b) => {
    if (hasHouseNumber) {
      if (a.kind === "point" && b.kind !== "point") return -1;
      if (b.kind === "point" && a.kind !== "point") return 1;
    }
    const r = KIND_RANK[a.kind] - KIND_RANK[b.kind];
    if (r !== 0) return r;
    return a.label.localeCompare(b.label, "he");
  });

  return deduped.slice(0, limit);
}
