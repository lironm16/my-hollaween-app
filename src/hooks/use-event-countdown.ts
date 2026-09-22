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

/** Live countdown to event night 17:00 — ticks every second. */
export function useEventCountdown() {
  const [stamp, setStamp] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setStamp(Date.now());
    const id = window.setInterval(tick, 1000);
    window.addEventListener(CLOCK_EVENT, tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener(CLOCK_EVENT, tick);
    };
  }, []);

  return useMemo(() => {
    const now = countdownNow(stamp);
    return {
      active: shouldShowEventCountdown(now),
      parts: eventCountdownRemaining(now),
    };
  }, [stamp]);
}
