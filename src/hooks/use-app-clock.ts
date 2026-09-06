"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  appNow,
  CLOCK_EVENT,
  readRehearsalScene,
  readServerSimDown,
  SERVER_SIM_EVENT,
  writeRehearsalScene,
  writeServerSimDown,
  type RehearsalScene,
} from "@/lib/app-clock";

function subscribeClock(onStoreChange: () => void) {
  const id = window.setInterval(onStoreChange, 15_000);
  window.addEventListener(CLOCK_EVENT, onStoreChange);
  return () => {
    window.clearInterval(id);
    window.removeEventListener(CLOCK_EVENT, onStoreChange);
  };
}

/** Live app clock (rehearsal night when a dry-run scene is on). */
export function useAppNow() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const stamp = useSyncExternalStore(
    subscribeClock,
    () => appNow().getTime(),
    () => Date.now(),
  );
  if (!mounted) return new Date();
  return new Date(stamp);
}

export function useRehearsalScene() {
  const [scene, setSceneState] = useState<RehearsalScene>("off");
  useEffect(() => {
    setSceneState(readRehearsalScene());
    const onChange = () => setSceneState(readRehearsalScene());
    window.addEventListener(CLOCK_EVENT, onChange);
    return () => window.removeEventListener(CLOCK_EVENT, onChange);
  }, []);
  const setScene = useCallback((next: RehearsalScene) => {
    writeRehearsalScene(next);
    setSceneState(next);
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
