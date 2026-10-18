"use client";

import { useMemo } from "react";
import { useGemHuntLocation } from "@/hooks/use-gem-hunt-location";
import type { UserLocation } from "@/hooks/use-user-location";

/** Live fix while hunting — hunt watch first, not the stale snapshot from hunt open. */
export function useGemHuntLiveLocation(options: {
  huntGpsEnabled: boolean;
  simulate: boolean;
  simulateLoc: UserLocation;
  seedLoc: UserLocation | null;
}): UserLocation | null {
  const huntGps = useGemHuntLocation(options.huntGpsEnabled && !options.simulate);
  return useMemo(() => {
    if (options.simulate) return options.simulateLoc;
    if (huntGps) return huntGps;
    return options.seedLoc;
  }, [options.simulate, options.simulateLoc, huntGps, options.seedLoc]);
}
