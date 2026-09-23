"use client";

import { useEffect, useMemo, useState } from "react";
import { appNow, CLOCK_EVENT, readRehearsalScene } from "@/lib/app-clock";
import { eventCountdownRemaining, shouldShowEventCountdown } from "@/lib/event-countdown";

/** Wall clock for countdown — live seconds. Rehearsal scenes use the sim clock. */
function countdownNow(stamp: number) {
  const scene = readRehearsalScene();
  if (scene === "off") return new Date(stamp || Date.now());
  return appNow();
}

/** Live countdown to event night 17:00 — ticks every second only while the bar or screen is shown. */
export function useEventCountdown({ screenOpen = false }: { screenOpen?: boolean } = {}) {
  const [stamp, setStamp] = useState(() => Date.now());

  const state = useMemo(() => {
    const now = countdownNow(stamp);
    return {
      active: shouldShowEventCountdown(now),
      parts: eventCountdownRemaining(now),
    };
  }, [stamp]);

  const shouldTick = state.parts !== null && (state.active || screenOpen);

  useEffect(() => {
    if (!shouldTick) return;
    const tick = () => setStamp(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    window.addEventListener(CLOCK_EVENT, tick);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      window.removeEventListener(CLOCK_EVENT, tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [shouldTick]);

  return state;
}
