"use client";

import { useEffect, useRef, useState } from "react";
import { GPS_MOVE_METERS, movedAtLeast } from "@/lib/geo";
import type { UserLocation } from "@/hooks/use-user-location";
import { GEM_STILL_SECONDS } from "@/lib/gem-hunt";

export function useStandingStill(location: UserLocation | null, enabled: boolean) {
  const [stillForMs, setStillForMs] = useState(0);
  const anchorRef = useRef<UserLocation | null>(null);
  const stillSinceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !location) {
      anchorRef.current = null;
      stillSinceRef.current = null;
      setStillForMs(0);
      return;
    }

    const anchor = anchorRef.current;
    if (!anchor || movedAtLeast(anchor, location, GPS_MOVE_METERS)) {
      anchorRef.current = location;
      stillSinceRef.current = Date.now();
      setStillForMs(0);
      return;
    }

    const tick = () => {
      const since = stillSinceRef.current;
      if (since == null) return;
      setStillForMs(Date.now() - since);
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [enabled, location?.lat, location?.lng, location?.accuracy]);

  const ready = enabled && stillForMs >= GEM_STILL_SECONDS * 1000;
  return { stillForMs, ready };
}
