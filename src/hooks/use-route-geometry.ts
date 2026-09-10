"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  applyStreetDistances,
  routeGeometryPoints,
  routePreviewPoints,
  shouldIncludeOriginInRoute,
  streetLegMeters,
  type LatLng,
  type WalkingRoute,
} from "@/lib/route";

function geometryKey(route: WalkingRoute) {
  const origin = `${route.origin.lat.toFixed(4)},${route.origin.lng.toFixed(4)}`;
  const stops = route.stops.map((stop) => stop.house.id).join(",");
  return `${origin}|${route.accessible ? "a" : "w"}|${route.startedFrom}|${stops}`;
}

export function useRouteGeometry(route: WalkingRoute | null, enabled: boolean) {
  const [line, setLine] = useState<LatLng[] | null>(null);
  const [streetRoute, setStreetRoute] = useState<WalkingRoute | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "fallback">("idle");
  const routeRef = useRef(route);
  routeRef.current = route;
  const key = useMemo(() => {
    if (!enabled || !route || route.stops.length === 0) return "";
    return geometryKey(route);
  }, [enabled, route]);

  useEffect(() => {
    const current = routeRef.current;
    if (!key || !current) {
      setLine(null);
      setStreetRoute(null);
      setStatus("idle");
      return;
    }
    const waypoints = routeGeometryPoints(current);
    const preview = routePreviewPoints(current);
    let cancelled = false;
    setStatus("loading");
    setLine(null);
    setStreetRoute(null);
    void fetch("/api/walk-route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points: waypoints }),
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = (await res.json()) as { line?: LatLng[] | null; legMeters?: number[] | null };
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        const street = data?.line ?? null;
        const includesOrigin = shouldIncludeOriginInRoute(current);
        const legs =
          data?.legMeters && data.legMeters.length > 0
            ? data.legMeters
            : street && street.length >= 2
              ? streetLegMeters(waypoints, street)
              : null;
        const withStreet =
          legs && legs.length > 0
            ? applyStreetDistances(current, legs, { includesOrigin })
            : null;
        if (street && street.length >= 2) {
          setLine(street);
          setStreetRoute(withStreet ?? current);
          setStatus("ready");
        } else if (withStreet) {
          setLine(preview.length >= 2 ? preview : null);
          setStreetRoute(withStreet);
          setStatus("ready");
        } else {
          setLine(preview.length >= 2 ? preview : null);
          setStreetRoute(null);
          setStatus("fallback");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setLine(preview.length >= 2 ? preview : null);
        setStreetRoute(null);
        setStatus("fallback");
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return { line, streetRoute, status };
}
