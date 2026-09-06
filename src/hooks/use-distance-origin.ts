"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  DISTANCE_ORIGIN_EVENT,
  readDistanceOrigin,
  resolveDistanceOrigin,
  writeDistanceOrigin,
  type DistanceOriginChoice,
} from "@/lib/distance-origin";

function subscribe(onStoreChange: () => void) {
  window.addEventListener(DISTANCE_ORIGIN_EVENT, onStoreChange);
  return () => window.removeEventListener(DISTANCE_ORIGIN_EVENT, onStoreChange);
}

export function useDistanceOrigin(gps: { lat: number; lng: number } | null | undefined) {
const choice = useSyncExternalStore(subscribe, readDistanceOrigin, readDistanceOrigin);
  const resolved = useMemo(() => resolveDistanceOrigin(choice, gps), [choice, gps]);
  const setChoice = useCallback((next: DistanceOriginChoice) => {
    writeDistanceOrigin(next);
  }, []);
  return { choice, resolved, setChoice };
}
