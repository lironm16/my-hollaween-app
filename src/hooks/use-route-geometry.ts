"use client";

import { useMemo } from "react";
import { routePreviewPoints, type LatLng, type WalkingRoute } from "@/lib/route";

/** Straight stop-to-stop lines for the map route overview. */
export function useRouteGeometry(route: WalkingRoute | null, enabled: boolean) {
  const line = useMemo((): LatLng[] | null => {
    if (!enabled || !route || route.stops.length < 2) return null;
    const preview = routePreviewPoints(route);
    return preview.length >= 2 ? preview : null;
  }, [enabled, route]);

  return { line, status: line ? ("fallback" as const) : ("idle" as const) };
}
