"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LatLng, WalkingRoute } from "@/lib/route";

export type RouteStopTravelState = "upcoming" | "current" | "sweep" | "done";

const SWEEP_MS = 1200;
const LINE_MS = 1400;

export function useRouteTravel(route: WalkingRoute | null, routeMode: boolean) {
  const [started, setStarted] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [sweepIndex, setSweepIndex] = useState<number | null>(null);
  const [lineReveal, setLineReveal] = useState(1);
  const [showComplete, setShowComplete] = useState(false);
  const [panTarget, setPanTarget] = useState<LatLng | null>(null);
  const [panTick, setPanTick] = useState(0);
  const animating = useRef(false);
  const timers = useRef<number[]>([]);

  const stopIds = route?.stops.map((stop) => stop.house.id) ?? [];
  const totalStops = stopIds.length;
  const currentIndex = started && completedCount < totalStops ? completedCount : -1;
  const currentStopId = currentIndex >= 0 ? stopIds[currentIndex] ?? null : null;
  const finished = started && totalStops > 0 && completedCount >= totalStops;

  function clearTimers() {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  }

  function reset() {
    clearTimers();
    animating.current = false;
    setStarted(false);
    setCompletedCount(0);
    setSweepIndex(null);
    setLineReveal(1);
    setShowComplete(false);
    setPanTarget(null);
    setPanTick(0);
  }

  useEffect(() => {
    if (!routeMode) reset();
  }, [routeMode]);

  useEffect(() => {
    reset();
  }, [route?.stops.map((stop) => stop.house.id).join("\0")]);

  const startTravel = useCallback(() => {
    if (!route || route.stops.length === 0) return;
    setStarted(true);
    setCompletedCount(0);
    setSweepIndex(null);
    setLineReveal(1);
    setShowComplete(false);
    const first = route.stops[0]?.house;
    if (first) {
      setPanTarget({ lat: first.lat, lng: first.lng });
      setPanTick((n) => n + 1);
    }
  }, [route]);

  const dismissComplete = useCallback(() => {
    setShowComplete(false);
  }, []);

  const stopState = useCallback(
    (houseId: string): RouteStopTravelState => {
      if (!started) return "upcoming";
      const idx = stopIds.indexOf(houseId);
      if (idx < 0) return "upcoming";
      if (sweepIndex === idx) return "sweep";
      if (idx < completedCount) return "done";
      if (idx === currentIndex) return "current";
      return "upcoming";
    },
    [started, stopIds, sweepIndex, completedCount, currentIndex],
  );

  const advanceAfterVisit = useCallback(
    (houseId: string) => {
      if (!route || !started || animating.current) return false;
      const idx = stopIds.indexOf(houseId);
      if (idx < 0 || idx !== completedCount) return false;

      animating.current = true;
      setSweepIndex(idx);
      setLineReveal(0);

      const start = performance.now();
      const tick = () => {
        const elapsed = performance.now() - start;
        setLineReveal(Math.min(1, elapsed / LINE_MS));
        if (elapsed < LINE_MS) {
          timers.current.push(window.setTimeout(tick, 32));
        }
      };
      tick();

      timers.current.push(
        window.setTimeout(() => {
          const nextCount = idx + 1;
          setCompletedCount(nextCount);
          setSweepIndex(null);
          setLineReveal(1);
          animating.current = false;

          if (nextCount >= totalStops) {
            setShowComplete(true);
            return;
          }

          const next = route.stops[nextCount]?.house;
          if (next) {
            setPanTarget({ lat: next.lat, lng: next.lng });
            setPanTick((n) => n + 1);
          }
        }, Math.max(SWEEP_MS, LINE_MS) + 80),
      );

      return true;
    },
    [route, started, stopIds, completedCount, totalStops],
  );

  useEffect(() => () => clearTimers(), []);

  return {
    started,
    completedCount,
    currentStopId,
    currentIndex,
    finished,
    sweepIndex,
    lineReveal,
    showComplete,
    panTarget,
    panTick,
    startTravel,
    advanceAfterVisit,
    dismissComplete,
    stopState,
    originStarted: started,
  };
}
