"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { routeGeometryPoints, routePreviewPoints, type LatLng, type WalkingRoute } from "@/lib/route";

function geometryKey(route: WalkingRoute) {
  const origin = `${route.origin.lat.toFixed(4)},${route.origin.lng.toFixed(4)}`;
  const stops = route.stops.map((stop) => stop.house.id).join(",");
  return `${origin}|${route.accessible ? "a" : "w"}|${route.startedFrom}|${stops}`;
}

export function useRouteGeometry(route: WalkingRoute | null, enabled: boolean) {
  const [line, setLine] = useState<LatLng[] | null>(null);
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
      setStatus("idle");
      return;
    }
    const waypoints = routeGeometryPoints(current);
    const preview = routePreviewPoints(current);
    let cancelled = false;
    setStatus("loading");
    setLine(preview.length >= 2 ? preview : null);
    void fetch("/api/walk-route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points: waypoints }),
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = (await res.json()) as { line?: LatLng[] | null };
        return data.line ?? null;
      })
      .then((street) => {
        if (cancelled) return;
        if (street && street.length >= 2) {
          setLine(street);
          setStatus("ready");
        } else {
          setLine(preview.length >= 2 ? preview : null);
          setStatus("fallback");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setLine(preview.length >= 2 ? preview : null);
        setStatus("fallback");
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return { line, status };
}
