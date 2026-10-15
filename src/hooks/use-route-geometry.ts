"use client";

import { useMemo } from "react";
import { routeProgressSegments, type RouteProgressSegment } from "@/lib/route-session-progress";
import type { WalkingRoute } from "@/lib/route";

/** Straight stop-to-stop lines for the map route overview. */
export function useRouteGeometry(
  route: WalkingRoute | null,
  enabled: boolean,
  visitedIds: readonly string[] = [],
  skippedIds: readonly string[] = [],
  routeModeActive = true,
) {
  const segments = useMemo((): RouteProgressSegment[] => {
    if (!enabled || !route || route.stops.length < 2) return [];
    return routeProgressSegments(route, visitedIds, skippedIds, routeModeActive);
  }, [enabled, route, visitedIds, skippedIds, routeModeActive]);

  const line = useMemo(() => {
    if (segments.length === 0) return null;
    const points = [segments[0]!.points[0], ...segments.map((segment) => segment.points[1])];
    return points.length >= 2 ? points : null;
  }, [segments]);

  return { line, segments, status: line ? ("fallback" as const) : ("idle" as const) };
}
