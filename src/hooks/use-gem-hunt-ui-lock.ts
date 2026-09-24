"use client";

import { useEffect, useSyncExternalStore } from "react";
import { isGemHuntSessionActive, subscribeGemHuntSession } from "@/lib/gem-hunt-session";
import type { PublicHouse } from "@/lib/types";

/** Snapshot map/list inputs while hunt overlay is open; release when user sees the map again. */
export function useGemHuntUiLock<THouse extends PublicHouse>(
  displayHouses: THouse[],
  now: Date,
): { locked: boolean; houses: THouse[]; now: Date } {
  const locked = useSyncExternalStore(
    subscribeGemHuntSession,
    isGemHuntSessionActive,
    () => false,
  );

  useEffect(() => {
    if (!locked) clearGemHuntUiSnapshot();
  }, [locked]);

  if (!locked) {
    return { locked: false, houses: displayHouses, now };
  }

  const snap = getOrCreateSnapshot(displayHouses, now);
  return { locked: true, houses: snap.houses as THouse[], now: snap.now };
}

type Snapshot = { houses: PublicHouse[]; now: Date };

let snapshot: Snapshot | null = null;

function getOrCreateSnapshot(houses: PublicHouse[], now: Date): Snapshot {
  if (!snapshot) {
    snapshot = { houses: [...houses], now: new Date(now.getTime()) };
  }
  return snapshot;
}

export function clearGemHuntUiSnapshot() {
  snapshot = null;
}

/** Call when hunt session ends so the next lock captures fresh data. */