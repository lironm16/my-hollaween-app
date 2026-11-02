import { config } from "@/lib/config";

const PLACES_BASE = "https://places.googleapis.com/v1";

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

type PlaceDetailsRow = {
  placeId: string;
  languageCode: string;
  formattedAddress?: string;
  displayName?: string;
  lat?: number;
  lng?: number;
  types: string[];
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

async function placeDetails(placeId: string, languageCode: string): Promise<PlaceDetailsRow> {
  const encoded = encodeURIComponent(placeId);
  const url = new URL(`${PLACES_BASE}/places/${encoded}`);
  url.searchParams.set("languageCode", languageCode);

  const res = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": apiKey(),
      "X-Goog-FieldMask": "id,formattedAddress,displayName,location,types",
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
  };
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
