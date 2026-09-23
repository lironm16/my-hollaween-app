"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { EventCountdownBar } from "@/components/event-countdown-bar";
import { EventCountdownFinale } from "@/components/event-countdown-finale";
import { useEventCountdown } from "@/hooks/use-event-countdown";
import { eventCountdownIsZero } from "@/lib/event-countdown";

const EventCountdownScreen = dynamic(
  () => import("@/components/event-countdown-screen").then((m) => m.EventCountdownScreen),
  { ssr: false },
);

/** Bottom countdown bar + full-screen overlay — extracted from neighborhood-app. */
export function EventCountdownLayer({ onComplete }: { onComplete: () => void }) {
  const [screenOpen, setScreenOpen] = useState(false);
  const [finale, setFinale] = useState(false);
  const hadCountdownRef = useRef(false);
  const eventCountdown = useEventCountdown({ screenOpen: screenOpen && !finale });

  const openScreen = useCallback(() => setScreenOpen(true), []);
  const closeScreen = useCallback(() => setScreenOpen(false), []);

  const beginFinale = useCallback(() => {
    setFinale(true);
    setScreenOpen(false);
  }, []);

  useEffect(() => {
    if (eventCountdown.parts) {
      hadCountdownRef.current = true;
      if (eventCountdownIsZero(eventCountdown.parts)) beginFinale();
      return;
    }
    if (hadCountdownRef.current) beginFinale();
  }, [eventCountdown.parts, beginFinale]);

  if (finale) {
    return <EventCountdownFinale onDone={onComplete} />;
  }

  if (!eventCountdown.parts) return null;

  return (
    <>
      {eventCountdown.active ? (
        <div className="event-countdown-dock shrink-0">
          <EventCountdownBar parts={eventCountdown.parts} onClick={openScreen} />
        </div>
      ) : null}
      {screenOpen ? (
        <EventCountdownScreen parts={eventCountdown.parts} onClose={closeScreen} />
      ) : null}
    </>
  );
}
