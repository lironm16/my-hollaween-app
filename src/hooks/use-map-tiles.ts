"use client";

import { useEffect, useState } from "react";
import { config } from "@/lib/config";
import type { MapTilesConfig } from "@/lib/map-tiles-types";

export function useMapTiles() {
  const [tiles, setTiles] = useState<MapTilesConfig>({ ...config.tiles });
  /** False until /api/map-config finishes — avoids flashing unkeyed CARTO tiles then remounting. */
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/map-config", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { tiles?: MapTilesConfig } | null) => {
        if (!cancelled && data?.tiles?.url) setTiles(data.tiles);
      })
      .catch(() => {
        /* keep build-time defaults */
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { tiles, ready };
}
