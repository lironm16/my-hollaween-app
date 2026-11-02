import type { BoundarySearchHit, EventBoundaryKind } from "@/lib/event-boundary";
import { roundEventBoundaryCoord, zoneKeyCity, zoneKeyPoint, zoneKeyStreet } from "@/lib/event-boundary";
import { reverseGeocodeAddress, reverseGeocodePointLabel } from "@/lib/event-boundary-nominatim.server";
import { pickGovNeighborhoodAtPoint } from "@/lib/gov-neighborhoods/pick-at-point.server";

function settlementFromAddress(addr: NonNullable<Awaited<ReturnType<typeof reverseGeocodeAddress>>>) {
  return (
    addr.city?.trim() ||
    addr.town?.trim() ||
    addr.municipality?.trim() ||
    addr.village?.trim() ||
    ""
  );
}

function roadFromAddress(addr: NonNullable<Awaited<ReturnType<typeof reverseGeocodeAddress>>>) {
  return addr.road?.trim() || addr.pedestrian?.trim() || addr.residential?.trim() || "";
}

function pointLabelFromGoogleHit(
  hit: Awaited<ReturnType<typeof import("@/lib/google-places.server").reverseGoogleAddress>>,
) {
  if (!hit) return null;
  const stripCity = hit.label.replace(/,?\s*רמת\s*גן\s*$/iu, "").trim();
  return stripCity || hit.road.trim() || hit.label;
}

async function pickPointFromGoogle(lat: number, lng: number): Promise<BoundarySearchHit | null> {
  const { googlePlacesConfigured, isEstablishmentTypes, primaryGooglePlaceType, reverseGoogleAddress } =
    await import("@/lib/google-places.server");
  if (!googlePlacesConfigured()) return null;
  try {
    const hit = await reverseGoogleAddress(lat, lng);
    if (!hit) return null;
    const rLat = roundEventBoundaryCoord(lat);
    const rLng = roundEventBoundaryCoord(lng);
    const poi = isEstablishmentTypes(hit.placeTypes ?? []);
    const label = poi ? hit.road.trim() || pointLabelFromGoogleHit(hit) : pointLabelFromGoogleHit(hit);
    if (!label) return null;
    return {
      kind: "point",
      id: hit.id.startsWith("google-place-") ? hit.id : zoneKeyPoint(rLat, rLng),
      label,
      city: hit.city || "רמת גן",
      subtitle: hit.addressLine?.trim() || hit.subtitle?.trim() || undefined,
      lat: rLat,
      lng: rLng,
      placeTypeLabel: primaryGooglePlaceType(hit.placeTypes),
    };
  } catch {
    return null;
  }
}

async function pickCityStreetFromGoogle(
  lat: number,
  lng: number,
  kind: "city" | "street",
): Promise<BoundarySearchHit | null> {
  const { googlePlacesConfigured, reverseGoogleAddress } = await import("@/lib/google-places.server");
  if (!googlePlacesConfigured()) return null;
  try {
    const hit = await reverseGoogleAddress(lat, lng);
    if (!hit) return null;
    const address = await reverseGeocodeAddress(lat, lng);
    const city =
      hit.city?.trim() ||
      (address ? settlementFromAddress(address) : "") ||
      "רמת גן";
    if (kind === "city") {
      if (!city) return null;
      return {
        kind: "city",
        id: zoneKeyCity(city),
        label: city,
        city,
        subtitle: "עיר שלמה",
      };
    }
    const street = address ? roadFromAddress(address) : hit.road.trim();
    if (!street) return null;
    return {
      kind: "street",
      id: zoneKeyStreet(city, street),
      label: street,
      city,
      subtitle: city,
    };
  } catch {
    return null;
  }
}

export async function pickBoundaryAtPoint(
  lat: number,
  lng: number,
  kind: EventBoundaryKind,
): Promise<BoundarySearchHit | null> {
  if (kind === "neighborhood") {
    return pickGovNeighborhoodAtPoint(lat, lng);
  }

  if (kind === "point") {
    const google = await pickPointFromGoogle(lat, lng);
    if (google) return google;
    const row = await reverseGeocodePointLabel(lat, lng);
    if (!row) return null;
    const rLat = roundEventBoundaryCoord(lat);
    const rLng = roundEventBoundaryCoord(lng);
    return {
      kind: "point",
      id: zoneKeyPoint(rLat, rLng),
      label: row.label,
      city: row.city,
      subtitle: row.city,
      lat: rLat,
      lng: rLng,
      placeTypeLabel: "nominatim",
    };
  }

  if (kind === "city" || kind === "street") {
    const google = await pickCityStreetFromGoogle(lat, lng, kind);
    if (google) return google;
  }

  const address = await reverseGeocodeAddress(lat, lng);
  if (!address) return null;

  if (kind === "city") {
    const city = settlementFromAddress(address);
    if (!city) return null;
    return {
      kind: "city",
      id: zoneKeyCity(city),
      label: city,
      city,
      subtitle: "עיר שלמה",
    };
  }

  if (kind === "street") {
    const street = roadFromAddress(address);
    const city = settlementFromAddress(address) || address.suburb?.trim() || "";
    if (!street || !city) return null;
    return {
      kind: "street",
      id: zoneKeyStreet(city, street),
      label: street,
      city,
      subtitle: city,
    };
  }

  return null;
}
