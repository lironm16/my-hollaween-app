"use client";

import { useEffect, useState } from "react";
import { fetchWalkingGeometry } from "@/lib/osrm-walk";
import { routePoints, type LatLng, type WalkingRoute } from "@/lib/route";

export function useRouteGeometry(route: WalkingRoute | null, enabled: boolean) {
  const [line, setLine] = useState<LatLng[] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "fallback">("idle");

  useEffect(() => {
    if (!enabled || !route || route.stops.length === 0) {
      setLine(null);
      setStatus("idle");
      return;
    }
    const points = routePoints(route);
    const fallback = points;
    let cancelled = false;
    setStatus("loading");
    setLine(fallback);
    void fetchWalkingGeometry(points).then((street) => {
      if (cancelled) return;
      if (street && street.length >= 2) {
        setLine(street);
        setStatus("ready");
      } else {
        setLine(fallback);
        setStatus("fallback");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, route]);

  return { line, status };
}
