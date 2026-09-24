"use client";

import { useCallback, useEffect, useState } from "react";
import {
  collectGem,
  GEM_CHANGED_EVENT,
  isGemCollected,
  loadGemCollected,
  loadGemCollectedIds,
  type GemCollectionEntry,
} from "@/lib/gem-progress";

export function useGemProgress() {
  const [entries, setEntries] = useState<GemCollectionEntry[]>(() =>
    typeof window === "undefined" ? [] : loadGemCollected(),
  );

  const read = useCallback(() => {
    setEntries(loadGemCollected());
  }, []);

  useEffect(() => {
    read();
    window.addEventListener("storage", read);
    window.addEventListener(GEM_CHANGED_EVENT, read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener(GEM_CHANGED_EVENT, read);
    };
  }, [read]);

  return {
    entries,
    collectedIds: entries.map((e) => e.houseId),
    collected: (id: string) => entries.some((e) => e.houseId === id),
    collect: (houseId: string, gemType: string) => {
      if (isGemCollected(houseId)) return loadGemCollectedIds();
      const next = collectGem({ houseId, gemType });
      setEntries(next);
      return next.map((e) => e.houseId);
    },
  };
}
