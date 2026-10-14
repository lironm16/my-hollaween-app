"use client";

import { useMemo } from "react";
import { useDistanceOrigin } from "@/hooks/use-distance-origin";
import { useUserLocation } from "@/hooks/use-user-location";
import { houseMapsUrl } from "@/lib/nav-links";
import type { PublicHouse } from "@/lib/types";

/** Google Maps walking link — respects the user’s route / distance starting point. */
export function useHouseMapsUrl(house: PublicHouse) {
  const geo = useUserLocation({ watch: false });
  const { resolved: origin } = useDistanceOrigin(geo.location);
  return useMemo(() => houseMapsUrl(house, { origin }), [house, origin]);
}
