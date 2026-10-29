"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EventCountdownLayer } from "@/components/event-countdown-layer";
import { useCatalog } from "@/hooks/use-catalog";
import { CLOCK_EVENT } from "@/lib/app-clock";
import { shouldShowEventCountdown } from "@/lib/event-countdown";
import { countdownBannerFromCatalog } from "@/lib/event-settings";

/**
 * Mount countdown UI only while the pre-event window is open.
 * After address reveal (or finale completes) the whole layer is removed — no tickers, no hooks.
 */
export function EventCountdownGate() {
  const { catalog } = useCatalog();
  const addressReveal = catalog?.eventSettings?.addressReveal;
  const eventOpenHours = catalog?.eventSettings?.eventOpenHours;
  const bannerAllowed = useMemo(
    () => countdownBannerFromCatalog(catalog?.eventSettings),
    [catalog?.eventSettings],
  );
  const [active, setActive] = useState(() => shouldShowEventCountdown(undefined, addressReveal));

  useEffect(() => {
    const sync = () => setActive(shouldShowEventCountdown(undefined, addressReveal));
    sync();
    window.addEventListener(CLOCK_EVENT, sync);
    return () => window.removeEventListener(CLOCK_EVENT, sync);
  }, [addressReveal]);

  const onComplete = useCallback(() => setActive(false), []);

  if (!bannerAllowed || !active) return null;

  return (
    <EventCountdownLayer
      addressReveal={addressReveal}
      eventOpenHours={eventOpenHours}
      onComplete={onComplete}
    />
  );
}
