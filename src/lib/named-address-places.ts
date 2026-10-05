import { inNeighborhood } from "@/lib/config";
import type { AddressHit } from "@/lib/types";

/** Curated buildings / campuses — same flow as street addresses (pick → pin on map). */
export type NamedAddressPlace = {
  /** Stored in the house `address` field after pick. */
  displayName: string;
  lat: number;
  lng: number;
  /** Optional street line for maps / footprint hints (not shown in the form field). */
  streetLine?: string;
  /** Extra search phrases (normalized matching). */
  aliases: string[];
};

export const NAMED_ADDRESS_PLACES: readonly NamedAddressPlace[] = [
  {
    displayName: "ביה״ס ניצנים",
    lat: 32.0933947,
    lng: 34.811005,
    streetLine: "רמבה",
    aliases: ["ניצנים", "בי\"ס ניצנים", "בית ספר ניצנים"],
  },
  {
    displayName: "ביה״ס המנחיל",
    lat: 32.0935807,
    lng: 34.8204925,
    streetLine: "העמל",
    aliases: ["המנחיל", "בי\"ס המנחיל", "בית ספר המנחיל"],
  },
  {
    displayName: "ביה״ס גבעולים",
    lat: 32.0886888,
    lng: 34.812861,
    streetLine: "התקווה 20",
    aliases: ["גבעולים", "בי\"ס גבעולים", "בית ספר גבעולים"],
  },
];

function normalizePlaceQuery(query: string) {
  let q = query.trim().replace(/\s+/g, " ");
  q = q.replace(/[״""`׳']/g, '"');
  q = q.replace(/בית\s+ספר/giu, 'ביה"ס');
  q = q.replace(/בי\s*ס/giu, 'ביה"ס');
  return q.toLowerCase();
}

function placeSearchKeys(place: NamedAddressPlace): string[] {
  const keys = new Set<string>();
  keys.add(normalizePlaceQuery(place.displayName));
  for (const alias of place.aliases) keys.add(normalizePlaceQuery(alias));
  return [...keys];
}

function scorePlaceMatch(normalizedQuery: string, key: string): number {
  if (normalizedQuery === key) return 100;
  if (key.startsWith(normalizedQuery) || normalizedQuery.startsWith(key)) return 80;
  if (key.includes(normalizedQuery) || normalizedQuery.includes(key)) return 60;
  return 0;
}

export function searchNamedAddressPlaces(query: string): AddressHit[] {
  const normalizedQuery = normalizePlaceQuery(query);
  if (normalizedQuery.length < 2) return [];

  const scored: Array<{ place: NamedAddressPlace; score: number }> = [];
  for (const place of NAMED_ADDRESS_PLACES) {
    let best = 0;
    for (const key of placeSearchKeys(place)) {
      best = Math.max(best, scorePlaceMatch(normalizedQuery, key));
    }
    if (best > 0) scored.push({ place, score: best });
  }
  scored.sort((a, b) => b.score - a.score);

  return scored.map(({ place }) => {
    const road = place.displayName;
    const inHood = inNeighborhood(place.lat, place.lng);
    const label = inHood ? `${road}, רמת גן` : `${road}, רמת גן`;
    return {
      id: `named-place-${normalizePlaceQuery(place.displayName).replace(/\s+/g, "-")}`,
      label,
      lat: place.lat,
      lng: place.lng,
      road,
      city: "רמת גן",
      precise: false,
    } satisfies AddressHit;
  });
}
