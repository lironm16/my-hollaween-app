"use client";

import { useEffect, useRef, useState } from "react";
import { distanceMeters } from "@/lib/geo";
import type { LatLng } from "@/lib/route";

type Status = "idle" | "loading" | "ready" | "error";

/** Walking polyline user → gem anchor (OSRM via /api/walk-route). */
export function useGemWalkRoute(
  from: LatLng | null,
  to: LatLng | null,
  enabled: boolean,
) {
  const [line, setLine] = useState<LatLng[] | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const lastFetchFrom = useRef<LatLng | null>(null);
  const lineRef = useRef<LatLng[] | null>(null);

  useEffect(() => {
    lineRef.current = line;
  }, [line]);

  useEffect(() => {
    if (!enabled || !from || !to) {
      setLine(null);
      setStatus("idle");
      lastFetchFrom.current = null;
      return;
    }

    const moved =
      lastFetchFrom.current == null ||
      distanceMeters(lastFetchFrom.current, from) > 22;
    if (!moved && lineRef.current && lineRef.current.length >= 2) return;

    let cancelled = false;
    setStatus("loading");
    void fetch("/api/walk-route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points: [from, to] }),
    })
      .then(async (res) => {
        const data = (await res.json()) as { line?: LatLng[] | null };
        if (cancelled) return;
        if (data.line && data.line.length >= 2) {
          setLine(data.line);
          setStatus("ready");
          lastFetchFrom.current = from;
        } else {
          setLine(null);
          setStatus("error");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLine(null);
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, from?.lat, from?.lng, to?.lat, to?.lng]);

  return { line, status };
}
