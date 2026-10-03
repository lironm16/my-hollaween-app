import {
  neighborhoodAtEventLocation,
  neighborhoodFromAddress,
  neighborhoodInferredFromPin,
  normalizeNeighborhoodId,
  isOutsideEventNeighborhoods,
  type NeighborhoodId,
} from "@/lib/config";

/**
 * What the map-zone pipeline assigned before manual hood selection (v5.4.7).
 * Used only to freeze values into `house.neighborhood` — not for runtime display.
 */
export function neighborhoodCalculatedLegacy(house: {
  address?: string;
  neighborhood?: NeighborhoodId | null;
  lat?: number;
  lng?: number;
}): NeighborhoodId | null {
  const lat = house.lat;
  const lng = house.lng;
  const hasCoords =
    typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng);

  if (hasCoords) {
    const zoned = neighborhoodAtEventLocation(lat, lng);
    if (zoned) return zoned;
  }

  const stored = house.neighborhood;
  if (stored !== undefined && stored !== null) {
    const normalized = normalizeNeighborhoodId(stored) ?? null;
    if (hasCoords) {
      if (normalized === "הגפן" && neighborhoodAtEventLocation(lat, lng) !== "הגפן") {
        return neighborhoodInferredFromPin(lat, lng);
      }
      if (isOutsideEventNeighborhoods(lat, lng)) {
        return null;
      }
    }
    return normalized;
  }

  if (house.address) {
    const fromText = neighborhoodFromAddress(house.address);
    if (fromText) return fromText;
  }

  if (hasCoords) {
    return neighborhoodInferredFromPin(lat, lng);
  }
  return null;
}

export type NeighborhoodBackfillMode = "missing" | "all";

export function houseNeedsNeighborhoodBackfill(
  house: { neighborhood?: NeighborhoodId | null },
  mode: NeighborhoodBackfillMode,
): boolean {
  if (mode === "all") return true;
  return house.neighborhood === undefined;
}

export type NeighborhoodBackfillChange = {
  id: string;
  address: string;
  from: NeighborhoodId | null | undefined;
  to: NeighborhoodId | null;
};

export function planNeighborhoodBackfill<
  T extends { id: string; address: string; neighborhood?: NeighborhoodId | null; lat?: number; lng?: number },
>(houses: T[], mode: NeighborhoodBackfillMode = "missing"): NeighborhoodBackfillChange[] {
  const changes: NeighborhoodBackfillChange[] = [];
  for (const house of houses) {
    if (!houseNeedsNeighborhoodBackfill(house, mode)) continue;
    const to = neighborhoodCalculatedLegacy(house);
    if (house.neighborhood === to) continue;
    changes.push({
      id: house.id,
      address: house.address,
      from: house.neighborhood,
      to,
    });
  }
  return changes;
}
