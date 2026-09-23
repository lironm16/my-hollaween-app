"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { EventCountdownBar } from "@/components/event-countdown-bar";
import { useEventCountdown } from "@/hooks/use-event-countdown";

const EventCountdownScreen = dynamic(
  () => import("@/components/event-countdown-screen").then((m) => m.EventCountdownScreen),
  { ssr: false },
);

/** Bottom countdown bar + full-screen overlay — extracted from neighborhood-app. */
export function EventCountdownLayer() {
  const [screenOpen, setScreenOpen] = useState(false);
  const eventCountdown = useEventCountdown({ screenOpen });

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
      {screenOpen ? (
        <EventCountdownScreen parts={eventCountdown.parts} onClose={closeScreen} />
      ) : null}
    </>
  );
}
