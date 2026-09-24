"use client";

import { useEffect, useSyncExternalStore } from "react";
import { isMapListSuspended, subscribeMapListSuspend } from "@/lib/map-list-suspend";
import type { PublicHouse } from "@/lib/types";

/** Snapshot map/list inputs while an overlay covers them; release when overlay closes. */
export function useMapListUiLock<THouse extends PublicHouse>(
  displayHouses: THouse[],
  now: Date,
): { locked: boolean; houses: THouse[]; now: Date } {
  const locked = useSyncExternalStore(
    subscribeMapListSuspend,
    isMapListSuspended,
    () => false,
  );

  useEffect(() => {
    if (!locked) clearMapListUiSnapshot();
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

export function clearMapListUiSnapshot() {
  snapshot = null;
}
