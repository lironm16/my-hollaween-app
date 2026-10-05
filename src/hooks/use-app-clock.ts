"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppClockContext } from "@/components/app-clock-provider";
import {
  CLOCK_EVENT,
  clockSnapshot,
  dateFromSnapshot,
  hydrationSafeClockSnapshot,
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
  const [localStamp, setLocalStamp] = useState(0);

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
  return dateFromSnapshot(localStamp !== 0 ? localStamp : hydrationSafeClockSnapshot());
}

export function useRehearsalScene() {
  const [scene, setSceneState] = useState<RehearsalScene>("off");
  const [, bump] = useState(0);
  useEffect(() => {
    const onChange = () => {
      setSceneState(readRehearsalScene());
      bump((n) => n + 1);
    };
    onChange();
    window.addEventListener(CLOCK_EVENT, onChange);
    return () => window.removeEventListener(CLOCK_EVENT, onChange);
  }, []);
  const setScene = useCallback((next: RehearsalScene) => {
    writeRehearsalScene(next);
    setSceneState(next);
    bump((n) => n + 1);
  }, []);
  return { scene, setScene };
}

export function useServerSim() {
  const [down, setDownState] = useState(false);
  useEffect(() => {
    setDownState(readServerSimDown());
    const onChange = () => setDownState(readServerSimDown());
    window.addEventListener(SERVER_SIM_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(SERVER_SIM_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  const setDown = useCallback((next: boolean) => {
    writeServerSimDown(next);
    setDownState(next);
  }, []);
  return { down, setDown };
}
