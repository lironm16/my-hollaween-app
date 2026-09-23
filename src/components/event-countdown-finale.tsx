"use client";

import { useEffect } from "react";

const FINALE_MS = 3200;

/** Short “we’re live” banner — no animations, unmounts quickly. */
export function EventCountdownFinale({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onDone, FINALE_MS);
    return () => window.clearTimeout(id);
  }, [onDone]);

  return (
    <div className="event-countdown-dock shrink-0" role="status" aria-live="polite">
      <div className="event-countdown-finale flex w-full items-center justify-center px-3 py-2 text-center">
        <p className="font-display text-lg text-orange-300 sm:text-xl">
          🎃 הגיע הזמן — ליל האלווין בשכונה!
        </p>
      </div>
    </div>
  );
}
