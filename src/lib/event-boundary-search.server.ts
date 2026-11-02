import { parsePointAddressQuery } from "@/lib/event-boundary-address-parse";
import type { BoundarySearchHit, EventBoundaryKind } from "@/lib/event-boundary";
import {
  queryEligibleForPointSearch,
  zoneKeyCity,
  zoneKeyNeighborhood,
  zoneKeyPoint,
  zoneKeyStreet,
} from "@/lib/event-boundary";
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

function isGooglePointHit(hit: BoundarySearchHit) {
  return hit.kind === "point" && hit.id.startsWith("google-place-");
}

function pointLabelForEventSearch(label: string) {
  return label.replace(/,?\s*רמת\s*גן\s*$/iu, "").replace(/,?\s*Ramat\s*Gan\s*$/iu, "").trim();
}

/** Google Places → event-creator נקודה rows (same stack as /api/address). */
export async function googlePointSearchHits(q: string, cap: number): Promise<BoundarySearchHit[]> {
  const { googlePlacesConfigured, searchGoogleAddressHits } = await import("@/lib/google-places.server");
  if (!googlePlacesConfigured()) return [];
  const { prepareAddressHits } = await import("@/lib/address-fields");
  try {
    const prepared = prepareAddressHits(await searchGoogleAddressHits(q, cap), q);
    return prepared.map((h) => {
      const label = pointLabelForEventSearch(h.label) || h.label;
      return {
        kind: "point" as const,
        id: h.id.startsWith("google-place-") ? h.id : zoneKeyPoint(h.lat, h.lng),
        label,
        city: h.city || "רמת גן",
        subtitle: h.subtitle ?? h.city ?? "רמת גן",
        lat: h.lat,
        lng: h.lng,
      };
    });
  } catch {
    return [];
  }
}

function mergeBoundaryHits(primary: BoundarySearchHit[], extra: BoundarySearchHit[]) {
  const seen = new Set(primary.map((h) => h.id));
  const merged = [...primary];
  for (const h of extra) {
    if (seen.has(h.id)) continue;
    seen.add(h.id);
    merged.push(h);
  }
  return merged;
}

function nominatimPointsToBoundaryHits(
  points: Awaited<ReturnType<typeof searchAddressPoints>>,
): BoundarySearchHit[] {
  return points.map((p) => ({
    kind: "point" as const,
    id: p.id,
    label: p.label,
    city: p.city,
    subtitle: p.city,
    lat: p.lat,
    lng: p.lng,
  }));
}

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
    const googlePts = await googlePointSearchHits(trimmed, limit);
    let nominatimPts: BoundarySearchHit[] = [];
    try {
      nominatimPts = nominatimPointsToBoundaryHits(await searchAddressPoints(trimmed, limit));
    } catch {
      // optional
    }
    return mergeBoundaryHits(googlePts, nominatimPts).slice(0, limit);
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
    const cap = Math.min(limit, 14);
    const googlePts = await googlePointSearchHits(trimmed, cap);
    hits.push(...googlePts);
    try {
      hits.push(...nominatimPointsToBoundaryHits(await searchAddressPoints(trimmed, cap)));
    } catch {
      // nominatim optional
    }
  }

  if (!filterKind && !hasHouseNumber) {
    hits.push(...(await googlePointSearchHits(trimmed, Math.min(limit, 10))));
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
    } else {
      const aG = isGooglePointHit(a);
      const bG = isGooglePointHit(b);
      if (aG && !bG) return -1;
      if (bG && !aG) return 1;
    }
    const r = KIND_RANK[a.kind] - KIND_RANK[b.kind];
    if (r !== 0) return r;
    return a.label.localeCompare(b.label, "he");
  });

  return deduped.slice(0, limit);
}
