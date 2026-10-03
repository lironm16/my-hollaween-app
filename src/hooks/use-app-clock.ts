"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useAppClockContext } from "@/components/app-clock-provider";
import {
  CLOCK_EVENT,
  clockSnapshot,
  dateFromSnapshot,
  readRehearsalScene,
  readServerSimDown,
  SERVER_SIM_EVENT,
  writeRehearsalScene,
  writeServerSimDown,
  type RehearsalScene,
} from "@/lib/app-clock";

/** Live app clock (rehearsal night when a dry-run scene is on). Uses shared AppClockProvider when present. */
export function useAppNow() {
  const shared = useAppClockContext();
  const [localStamp, setLocalStamp] = useState(() =>
    typeof window === "undefined" ? 0 : clockSnapshot(),
  );

  useEffect(() => {
    if (shared) return;
    const tick = () => setLocalStamp(clockSnapshot());
    tick();
    const id = window.setInterval(tick, 15_000);
    window.addEventListener(CLOCK_EVENT, tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener(CLOCK_EVENT, tick);
    };
  }, [shared]);

  if (shared) return shared;
  return dateFromSnapshot(localStamp || clockSnapshot());
}

function subscribeClock(onStoreChange: () => void) {
  window.addEventListener(CLOCK_EVENT, onStoreChange);
  return () => window.removeEventListener(CLOCK_EVENT, onStoreChange);
}

function subscribeServerSim(onStoreChange: () => void) {
  window.addEventListener(SERVER_SIM_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(SERVER_SIM_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function useRehearsalScene() {
  const scene = useSyncExternalStore(subscribeClock, readRehearsalScene, (): RehearsalScene => "off");
  const setScene = useCallback((next: RehearsalScene) => {
    writeRehearsalScene(next);
  }, []);
  return { scene, setScene };
}

export function useServerSim() {
  const down = useSyncExternalStore(subscribeServerSim, readServerSimDown, () => false);
  const setDown = useCallback((next: boolean) => {
    writeServerSimDown(next);
  }, []);
  return { down, setDown };
}
