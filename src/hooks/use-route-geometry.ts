"use client";

import { useMemo } from "react";
import { splitRoutePreviewProgress, type LatLng, type WalkingRoute } from "@/lib/route";

/** Straight stop-to-stop lines for the map route overview. */
export function useRouteGeometry(
  route: WalkingRoute | null,
  enabled: boolean,
  prefixStopCount = 0,
) {
  const { done, planned } = useMemo((): { done: LatLng[] | null; planned: LatLng[] | null } => {
    if (!enabled || !route || route.stops.length < 2) {
      return { done: null, planned: null };
    }
    const split = splitRoutePreviewProgress(route, prefixStopCount);
    return {
      done: split.done.length >= 2 ? split.done : null,
      planned: split.planned.length >= 2 ? split.planned : null,
    };
  }, [enabled, route, prefixStopCount]);

  const line = planned ?? done;
  return { line, done, planned, status: line ? ("fallback" as const) : ("idle" as const) };
}
