"use client";

import { useEffect, useState } from "react";
import {
  ensureGemOsmAnchorsLoaded,
  gemOsmAnchorsEpoch,
  subscribeGemOsmAnchors,
} from "@/lib/gem-osm-anchor-cache";

/** Re-render when `/gem-osm-anchors.json` finishes loading or updates. */
export function useGemOsmAnchorsEpoch() {
  const [epoch, setEpoch] = useState(() => gemOsmAnchorsEpoch());

  useEffect(() => {
    ensureGemOsmAnchorsLoaded();
    setEpoch(gemOsmAnchorsEpoch());
    return subscribeGemOsmAnchors(() => setEpoch(gemOsmAnchorsEpoch()));
  }, []);

  return epoch;
}
