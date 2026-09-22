"use client";

import { useEffect, useMemo, useState } from "react";
import { appNow, CLOCK_EVENT } from "@/lib/app-clock";
import { eventCountdownRemaining, shouldShowEventCountdown } from "@/lib/event-countdown";

/** Live countdown to event night 17:00 — ticks every second. */
export function useEventCountdown() {
  const [stamp, setStamp] = useState(0);

  useEffect(() => {
    const tick = () => setStamp(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    window.addEventListener(CLOCK_EVENT, tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener(CLOCK_EVENT, tick);
    };
  }, []);

  return useMemo(() => {
    void stamp;
    const now = appNow();
    return {
      active: shouldShowEventCountdown(now),
      parts: eventCountdownRemaining(now),
    };
  }, [stamp]);
}
