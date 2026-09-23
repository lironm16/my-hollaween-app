"use client";

import { useCallback, useState } from "react";
import { EventCountdownBar } from "@/components/event-countdown-bar";
import { EventCountdownScreen } from "@/components/event-countdown-screen";
import { useEventCountdown } from "@/hooks/use-event-countdown";

/** Bottom countdown bar + full-screen overlay — extracted from neighborhood-app. */
export function EventCountdownLayer() {
  const eventCountdown = useEventCountdown();
  const [screenOpen, setScreenOpen] = useState(false);

  const openScreen = useCallback(() => setScreenOpen(true), []);
  const closeScreen = useCallback(() => setScreenOpen(false), []);

  if (!eventCountdown.parts) return null;

  return (
    <>
      {eventCountdown.active ? (
        <div className="event-countdown-dock shrink-0">
          <EventCountdownBar parts={eventCountdown.parts} onClick={openScreen} />
        </div>
      ) : null}
      <EventCountdownScreen open={screenOpen} parts={eventCountdown.parts} onClose={closeScreen} />
    </>
  );
}
