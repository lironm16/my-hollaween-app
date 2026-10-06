import { activeGemHuntMeters, gemDistanceMeters } from "@/lib/gem-hunt";
import type { PublicHouse } from "@/lib/types";
import type { UserLocation } from "@/hooks/use-user-location";

import { GEM_TELL_ME_RANGE_HE } from "@/lib/gem-hunt-copy";

export const GEM_TELL_ME_OUT_OF_RANGE_MESSAGE = GEM_TELL_ME_RANGE_HE;

/** Visitors always gated; admins only when «תצוגת משתמש» is on. */
export function gemTellMeHuntRadiusEnforced(isAdmin: boolean, previewAsUser: boolean): boolean {
  if (!isAdmin) return true;
  return previewAsUser;
}

export function gemTellMeInRange(
  userLocation: UserLocation | null,
  house: PublicHouse,
  simulateInRange: boolean,
): boolean {
  if (simulateInRange) return true;
  if (!userLocation) return false;
  return gemDistanceMeters(userLocation, house) <= activeGemHuntMeters();
}
