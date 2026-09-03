"use client";

import { useEffect, useState } from "react";
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
    let cancelled = false;
    setStatus("loading");
    setLine(points);
    void fetch("/api/walk-route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points }),
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
          setLine(points);
          setStatus("fallback");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setLine(points);
        setStatus("fallback");
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, route]);

  return { line, status };
}
