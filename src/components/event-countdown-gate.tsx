"use client";

import { useCallback, useEffect, useState } from "react";
import { EventCountdownLayer } from "@/components/event-countdown-layer";
import { CLOCK_EVENT } from "@/lib/app-clock";
import { shouldShowEventCountdown } from "@/lib/event-countdown";

/**
 * Mount countdown UI only while the pre-event window is open.
 * After 17:00 (or finale completes) the whole layer is removed — no tickers, no hooks.
 */
export function EventCountdownGate() {
  const [active, setActive] = useState(() => shouldShowEventCountdown());

  useEffect(() => {
    const sync = () => setActive(shouldShowEventCountdown());
    window.addEventListener(CLOCK_EVENT, sync);
    return () => window.removeEventListener(CLOCK_EVENT, sync);
  }, []);

  const onComplete = useCallback(() => setActive(false), []);

  if (!active) return null;

  return <EventCountdownLayer onComplete={onComplete} />;
}
