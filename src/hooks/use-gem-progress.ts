"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  collectGem,
  GEM_CHANGED_EVENT,
  isGemCollected,
  loadGemCollected,
  loadGemCollectedIds,
  resetGemProgress,
  type GemCollectionEntry,
} from "@/lib/gem-progress";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(GEM_CHANGED_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(GEM_CHANGED_EVENT, onStoreChange);
  };
}

export function useGemProgress() {
  const entries = useSyncExternalStore(
    subscribe,
    loadGemCollected,
    () => [] as GemCollectionEntry[],
  );

  const collectedIds = useMemo(
    () => entries.map((e) => e.houseId),
    [entries],
  );

  return {
    entries,
    collectedIds,
    collected: (id: string) => entries.some((e) => e.houseId === id),
    collect: (houseId: string, gemType: string) => {
      if (isGemCollected(houseId)) return loadGemCollectedIds();
      collectGem({ houseId, gemType });
      return loadGemCollectedIds();
    },
    resetHouse: (houseId: string) => {
      resetGemProgress({ houseId });
    },
    resetAll: () => {
      resetGemProgress();
    },
  };
}
