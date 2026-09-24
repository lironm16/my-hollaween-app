"use client";

import { useCallback, useEffect, useState } from "react";
import {
  GEM_ANCHOR_CHANGED_EVENT,
  loadGemAnchorOverrides,
  type GemAnchorOverrideMap,
} from "@/lib/gem-anchor-overrides";

export function useGemAnchorOverrides() {
  const [map, setMap] = useState<GemAnchorOverrideMap>(() =>
    typeof window === "undefined" ? {} : loadGemAnchorOverrides(),
  );

  const read = useCallback(() => setMap(loadGemAnchorOverrides()), []);

  useEffect(() => {
    read();
    window.addEventListener("storage", read);
    window.addEventListener(GEM_ANCHOR_CHANGED_EVENT, read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener(GEM_ANCHOR_CHANGED_EVENT, read);
    };
  }, [read]);

  return { overrides: map, hasOverride: (houseId: string) => Boolean(map[houseId]) };
}
