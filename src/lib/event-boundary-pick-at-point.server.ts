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

export async function pickBoundaryAtPoint(
  lat: number,
  lng: number,
  kind: EventBoundaryKind,
): Promise<BoundarySearchHit | null> {
  if (kind === "neighborhood") {
    return pickGovNeighborhoodAtPoint(lat, lng);
  }

  if (kind === "point") {
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
    };
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
