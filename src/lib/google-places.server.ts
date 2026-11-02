import { parseStreetAndNumber } from "@/lib/address-text";
import { config } from "@/lib/config";
import type { AddressHit } from "@/lib/types";

const PLACES_BASE = "https://places.googleapis.com/v1";
const GEOCODE_BASE = "https://maps.googleapis.com/maps/api/geocode/json";

export function googlePlacesConfigured() {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY?.trim());
}

function apiKey() {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!key) throw new Error("missing_google_maps_api_key");
  return key;
}

type AutocompleteSuggestion = {
  placeId: string;
  primary: string;
  secondary?: string;
  types: string[];
};

type AddressComponent = {
  types: string[];
  longText?: string;
  shortText?: string;
};

type PlaceDetailsRow = {
  placeId: string;
  languageCode: string;
  formattedAddress?: string;
  displayName?: string;
  lat?: number;
  lng?: number;
  types: string[];
  addressComponents?: AddressComponent[];
};

export type GooglePlacesTryResult = {
  configured: true;
  input: string;
  autocompleteLanguage: string;
  suggestions: AutocompleteSuggestion[];
  details: Array<{
    placeId: string;
    types: string[];
    he?: PlaceDetailsRow;
    en?: PlaceDetailsRow;
  }>;
};

function ramatGanBias() {
  return {
    circle: {
      center: {
        latitude: config.map.center.lat,
        longitude: config.map.center.lng,
      },
      radius: 14_000,
    },
  };
}

function pickAutocompleteLanguage(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "he";
  const latin = (trimmed.match(/[A-Za-z]/g) ?? []).length;
  const hebrew = (trimmed.match(/[\u0590-\u05FF]/g) ?? []).length;
  if (latin > hebrew) return "en";
  return "he";
}

async function placesAutocomplete(input: string, languageCode: string): Promise<AutocompleteSuggestion[]> {
  const res = await fetch(`${PLACES_BASE}/places:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey(),
    },
    body: JSON.stringify({
      input,
      languageCode,
      includedRegionCodes: ["IL"],
      locationBias: ramatGanBias(),
    }),
    signal: AbortSignal.timeout(12_000),
  });
  const body = (await res.json().catch(() => ({}))) as {
    error?: { message?: string; status?: string };
    suggestions?: Array<{
      placePrediction?: {
        placeId?: string;
        types?: string[];
        text?: { text?: string };
        structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
      };
    }>;
  };
  if (!res.ok) {
    const msg = body.error?.message ?? body.error?.status ?? `http_${res.status}`;
    throw new Error(`google_autocomplete_failed:${msg}`);
  }

  const out: AutocompleteSuggestion[] = [];
  for (const s of body.suggestions ?? []) {
    const p = s.placePrediction;
    if (!p?.placeId) continue;
    const primary =
      p.structuredFormat?.mainText?.text?.trim() ||
      p.text?.text?.trim() ||
      p.placeId;
    const secondary = p.structuredFormat?.secondaryText?.text?.trim();
    out.push({
      placeId: p.placeId,
      primary,
      secondary,
      types: p.types ?? [],
    });
  }
  return out;
}

function placeResourceId(placeId: string) {
  return placeId.startsWith("places/") ? placeId.slice("places/".length) : placeId;
}

async function placeDetails(placeId: string, languageCode: string): Promise<PlaceDetailsRow> {
  const encoded = encodeURIComponent(placeResourceId(placeId));
  const url = new URL(`${PLACES_BASE}/places/${encoded}`);
  url.searchParams.set("languageCode", languageCode);

  const res = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": apiKey(),
      "X-Goog-FieldMask": "id,formattedAddress,displayName,location,types,addressComponents",
    },
    signal: AbortSignal.timeout(12_000),
  });
  const body = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    id?: string;
    formattedAddress?: string;
    displayName?: { text?: string };
    location?: { latitude?: number; longitude?: number };
    types?: string[];
  };
  if (!res.ok) {
    const msg = body.error?.message ?? `http_${res.status}`;
    throw new Error(`google_details_failed:${msg}`);
  }
  return {
    placeId: body.id ?? placeId,
    languageCode,
    formattedAddress: body.formattedAddress,
    displayName: body.displayName?.text,
    lat: body.location?.latitude,
    lng: body.location?.longitude,
    types: body.types ?? [],
    addressComponents: (body as { addressComponents?: AddressComponent[] }).addressComponents,
  };
}

function inSearchArea(lat: number, lng: number) {
  const b = config.map.bounds;
  const latPad = 0.0015;
  const lngPad = 0.0015;
  return (
    lat >= b.south - latPad &&
    lat <= b.north + latPad &&
    lng >= b.west - lngPad &&
    lng <= b.east + lngPad
  );
}

function componentLong(components: AddressComponent[] | undefined, type: string) {
  for (const c of components ?? []) {
    if (c.types.includes(type)) return (c.longText ?? c.shortText)?.trim();
  }
  return undefined;
}

function isRamatGanLocality(components: AddressComponent[] | undefined, formatted?: string) {
  const city =
    componentLong(components, "locality") ||
    componentLong(components, "administrative_area_level_2") ||
    "";
  if (city.includes("רמת גן") || city.toLowerCase().includes("ramat gan")) return true;
  const text = formatted ?? "";
  return /רמת\s*גן/u.test(text) || /ramat\s*gan/iu.test(text);
}

function googleHitId(placeId: string) {
  return `google-place-${placeResourceId(placeId)}`;
}

export function isEstablishmentTypes(types: string[]) {
  return types.some((t) =>
    ["establishment", "point_of_interest", "school", "store", "shopping_mall", "park"].includes(t),
  );
}

const GENERIC_GOOGLE_TYPES = new Set([
  "establishment",
  "point_of_interest",
  "geocode",
  "premise",
  "street_address",
  "route",
]);

/** Raw primary type for UI experiments (shows what Google returned). */
export function primaryGooglePlaceType(types: string[] | undefined): string | undefined {
  if (!types?.length) return undefined;
  return types.find((t) => !GENERIC_GOOGLE_TYPES.has(t)) ?? types[0];
}

function googleDetailsToAddressHit(
  details: PlaceDetailsRow,
  query: string,
  hint?: { secondary?: string },
): AddressHit | null {
  const lat = details.lat;
  const lng = details.lng;
  if (lat === undefined || lng === undefined || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  if (!inSearchArea(lat, lng)) return null;
  if (!isRamatGanLocality(details.addressComponents, details.formattedAddress)) return null;

  const route =
    componentLong(details.addressComponents, "route")?.replace(/^רחוב\s+/u, "").trim() || "";
  const houseNumber =
    componentLong(details.addressComponents, "street_number") ||
    parseStreetAndNumber(details.formattedAddress ?? "").num ||
    parseStreetAndNumber(query).num;

  const establishment = isEstablishmentTypes(details.types);
  const display = details.displayName?.trim() || "";
  const road = route || display || parseStreetAndNumber(query).road.trim();
  if (!road) return null;

  const streetLine =
    route && houseNumber ? `${route} ${houseNumber}` : route || display || details.formattedAddress || road;
  const precise = Boolean(houseNumber) || details.types.includes("street_address") || details.types.includes("premise");

  const addressLine =
    route && houseNumber
      ? `${route} ${houseNumber}`.trim()
      : hint?.secondary?.trim() || undefined;

  const labelBase =
    establishment && display ? display : streetLine.trim() || road;
  const label = /רמת\s*גן/u.test(labelBase) ? labelBase : `${labelBase}, רמת גן`;

  return {
    id: googleHitId(details.placeId),
    label,
    lat,
    lng,
    road: establishment && !route ? display || road : road,
    houseNumber: houseNumber || undefined,
    city: "רמת גן",
    precise: establishment && !houseNumber ? true : precise,
    subtitle: establishment ? addressLine : hint?.secondary?.trim() || (route ? route : undefined),
    addressLine: establishment ? addressLine : undefined,
    placeTypes: details.types,
  };
}

/** Production address autocomplete — Places autocomplete + details for top hits. */
export async function searchGoogleAddressHits(query: string, limit = 6): Promise<AddressHit[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2 || !googlePlacesConfigured()) return [];

  const language = pickAutocompleteLanguage(trimmed);
  const suggestions = await placesAutocomplete(trimmed, language);
  const slice = suggestions.slice(0, limit);

  const rows = await Promise.all(
    slice.map(async (s) => {
      try {
        const details = await placeDetails(s.placeId, language);
        return googleDetailsToAddressHit(details, trimmed, { secondary: s.secondary });
      } catch {
        return null;
      }
    }),
  );
  return rows.filter((h): h is AddressHit => Boolean(h));
}

type GeocodeJsonResult = {
  results?: Array<{
    formatted_address?: string;
    place_id?: string;
    types?: string[];
    geometry?: { location?: { lat?: number; lng?: number } };
    address_components?: Array<{ long_name?: string; short_name?: string; types?: string[] }>;
  }>;
  status?: string;
  error_message?: string;
};

function legacyComponentsToAddressComponents(
  raw?: Array<{ long_name?: string; short_name?: string; types?: string[] }>,
): AddressComponent[] {
  return (raw ?? []).map((c) => ({
    types: c.types ?? [],
    longText: c.long_name,
    shortText: c.short_name,
  }));
}

/** Reverse geocode pin drops via Google Geocoding API (Hebrew). */
export async function reverseGoogleAddress(lat: number, lng: number): Promise<AddressHit | null> {
  if (!googlePlacesConfigured()) return null;
  const url = new URL(GEOCODE_BASE);
  url.searchParams.set("latlng", `${lat},${lng}`);
  url.searchParams.set("language", "he");
  url.searchParams.set("key", apiKey());

  const res = await fetch(url, { signal: AbortSignal.timeout(12_000), cache: "no-store" });
  const body = (await res.json().catch(() => ({}))) as GeocodeJsonResult;
  if (!res.ok || body.status === "ZERO_RESULTS") return null;
  if (body.status && body.status !== "OK") {
    throw new Error(`google_reverse_failed:${body.status}:${body.error_message ?? ""}`);
  }

  for (const row of body.results ?? []) {
    const glat = row.geometry?.location?.lat;
    const glng = row.geometry?.location?.lng;
    if (glat === undefined || glng === undefined) continue;
    const details: PlaceDetailsRow = {
      placeId: row.place_id ?? `geocode-${glat}-${glng}`,
      languageCode: "he",
      formattedAddress: row.formatted_address,
      lat: glat,
      lng: glng,
      types: row.types ?? [],
      addressComponents: legacyComponentsToAddressComponents(row.address_components),
    };
    const hit = googleDetailsToAddressHit(details, "");
    if (hit) return hit;
  }
  return null;
}

/** Trial helper: autocomplete + Hebrew/English details for the first few hits. */
export async function googlePlacesTrySearch(input: string, detailLimit = 4): Promise<GooglePlacesTryResult> {
  const trimmed = input.trim();
  if (trimmed.length < 2) {
    return {
      configured: true,
      input: trimmed,
      autocompleteLanguage: pickAutocompleteLanguage(trimmed),
      suggestions: [],
      details: [],
    };
  }

  const autocompleteLanguage = pickAutocompleteLanguage(trimmed);
  const suggestions = await placesAutocomplete(trimmed, autocompleteLanguage);
  const slice = suggestions.slice(0, detailLimit);

  const details = await Promise.all(
    slice.map(async (s) => {
      const [he, en] = await Promise.all([
        placeDetails(s.placeId, "he").catch(() => undefined),
        placeDetails(s.placeId, "en").catch(() => undefined),
      ]);
      return {
        placeId: s.placeId,
        types: s.types,
        he,
        en,
      };
    }),
  );

  return {
    configured: true,
    input: trimmed,
    autocompleteLanguage,
    suggestions,
    details,
  };
}
