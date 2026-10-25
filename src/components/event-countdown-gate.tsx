"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EventCountdownLayer } from "@/components/event-countdown-layer";
import { useCatalog } from "@/hooks/use-catalog";
import { CLOCK_EVENT } from "@/lib/app-clock";
import { shouldShowEventCountdown } from "@/lib/event-countdown";
import { countdownBannerFromCatalog } from "@/lib/event-settings";

/**
 * Mount countdown UI only while the pre-event window is open.
 * After 17:00 (or finale completes) the whole layer is removed — no tickers, no hooks.
 */
export function EventCountdownGate() {
  const { catalog } = useCatalog();
  const bannerAllowed = useMemo(
    () => countdownBannerFromCatalog(catalog?.eventSettings),
    [catalog?.eventSettings],
  );
  const [active, setActive] = useState(() => shouldShowEventCountdown());

  useEffect(() => {
    const sync = () => setActive(shouldShowEventCountdown());
    window.addEventListener(CLOCK_EVENT, sync);
    return () => window.removeEventListener(CLOCK_EVENT, sync);
  }, []);

  const onComplete = useCallback(() => setActive(false), []);

  if (!bannerAllowed || !active) return null;

  return <EventCountdownLayer onComplete={onComplete} />;
}
