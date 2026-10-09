import { searchPreparedAddresses } from "@/lib/address-fields";
import { isSchoolCampusAddress } from "@/lib/school-campus";
import type { HouseInput } from "@/lib/types";

/** Owners may not drag the pin — coords follow address geocode unless admin. */
export async function pinCoordsForOwnerSubmit(
  input: Pick<HouseInput, "address" | "lat" | "lng">,
  admin: boolean,
): Promise<{ lat: number; lng: number }> {
  if (admin || isSchoolCampusAddress(input.address)) {
    return { lat: input.lat, lng: input.lng };
  }
  const hits = await searchPreparedAddresses(input.address.trim());
  const top = hits[0];
  if (top) return { lat: top.lat, lng: top.lng };
  return { lat: input.lat, lng: input.lng };
}

export function stripDisallowedOwnerPinPatch<T extends Partial<HouseInput>>(
  existing: Pick<HouseInput, "address">,
  patch: T,
  admin: boolean,
): T {
  if (admin) return patch;
  const addressChanging =
    patch.address !== undefined && patch.address.trim() !== existing.address.trim();
  if (addressChanging) return patch;
  const next = { ...patch };
  delete next.lat;
  delete next.lng;
  return next;
}
