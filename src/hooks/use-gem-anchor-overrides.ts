"use client";

import { useSyncExternalStore } from "react";
import {
  GEM_ANCHOR_CHANGED_EVENT,
  loadGemAnchorOverrides,
  type GemAnchorOverrideMap,
} from "@/lib/gem-anchor-overrides";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(GEM_ANCHOR_CHANGED_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(GEM_ANCHOR_CHANGED_EVENT, onStoreChange);
  };
}

export function useGemAnchorOverrides() {
  const map = useSyncExternalStore(subscribe, loadGemAnchorOverrides, () => ({} as GemAnchorOverrideMap));

  return { overrides: map, hasOverride: (houseId: string) => Boolean(map[houseId]) };
}
