"use client";

import { useEffect, useRef, useState } from "react";
import { metaRestoreTriggers, temporarySkipRestoreMet } from "@/lib/skip-reasons";
import type { HouseFiltersState, SkippedHouseMeta } from "@/lib/offline-db";
import type { PublicHouse } from "@/lib/types";

export function useSkipRestoreUndoPrompt({
  houses,
  skippedIds,
  metaFor,
  filters,
  now,
}: {
  houses: PublicHouse[];
  skippedIds: string[];
  metaFor: (id: string) => SkippedHouseMeta | undefined;
  filters: HouseFiltersState;
  now: Date;
}) {
  const [promptHouseId, setPromptHouseId] = useState<string | null>(null);
  const metRef = useRef<Map<string, boolean>>(new Map());
  const dismissedWhileMetRef = useRef<Set<string>>(new Set());

  const promptRef = useRef<string | null>(null);
  promptRef.current = promptHouseId;

  useEffect(() => {
    const housesById = new Map(houses.map((house) => [house.id, house]));

    for (const id of skippedIds) {
      const meta = metaFor(id);
      const house = housesById.get(id);
      if (!house || !meta?.temporary) continue;
      if (metaRestoreTriggers(meta).length === 0) continue;

      const met = temporarySkipRestoreMet(house, meta, now, filters);
      const wasMet = metRef.current.get(id) ?? false;

      if (!met) {
        metRef.current.set(id, false);
        dismissedWhileMetRef.current.delete(id);
        if (promptRef.current === id) setPromptHouseId(null);
        continue;
      }

      metRef.current.set(id, true);
      const risingEdge = !wasMet;
      if (
        risingEdge &&
        !dismissedWhileMetRef.current.has(id) &&
        promptRef.current === null
      ) {
        setPromptHouseId(id);
      }
    }
  }, [houses, skippedIds, metaFor, filters, now]);

  function dismissPrompt() {
    if (promptHouseId) dismissedWhileMetRef.current.add(promptHouseId);
    setPromptHouseId(null);
  }

  return { promptHouseId, dismissPrompt, clearPrompt: () => setPromptHouseId(null) };
}
