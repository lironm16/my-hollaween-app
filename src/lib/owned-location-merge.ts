import { houseUpdatedMs } from "@/lib/house-updated-at";
import type { PublicHouse } from "@/lib/types";

function hasStreetAddress(house: Pick<PublicHouse, "address"> | null | undefined): boolean {
  return Boolean(house?.address?.trim());
}

/**
 * Merge device preview / pending row with catalog — public catalog strips addresses before reveal;
 * never drop a saved street address when the incoming row only has שכונה.
 */
export function mergeOwnedLocationFields(local: PublicHouse, remote: PublicHouse): PublicHouse {
  const merged =
    houseUpdatedMs(remote.updatedAt) >= houseUpdatedMs(local.updatedAt)
      ? { ...local, ...remote }
      : { ...remote, ...local };
  if (hasStreetAddress(merged)) return merged;
  const donor = hasStreetAddress(local) ? local : hasStreetAddress(remote) ? remote : null;
  if (!donor) return merged;
  return {
    ...merged,
    address: donor.address,
    arrival: donor.arrival?.trim() ? donor.arrival : merged.arrival,
    notes: donor.notes?.trim() ? donor.notes : merged.notes,
    lat: donor.lat,
    lng: donor.lng,
  };
}
