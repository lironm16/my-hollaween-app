"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  ensureGemOsmAnchorsLoaded,
  gemOsmAnchorsEpoch,
  subscribeGemOsmAnchors,
} from "@/lib/gem-osm-anchor-cache";

/** Re-render when `/gem-osm-anchors.json` finishes loading or updates. */
export function useGemOsmAnchorsEpoch() {
  useEffect(() => {
    ensureGemOsmAnchorsLoaded();
  }, []);

  return useSyncExternalStore(subscribeGemOsmAnchors, gemOsmAnchorsEpoch, gemOsmAnchorsEpoch);
}
