"use client";

import { useEffect, type CSSProperties } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const FINALE_MS = 3200;

/** Short “we’re live” dock — static, dismissible, then fully unmounts. */
export function EventCountdownFinale({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onDone, FINALE_MS);
    return () => window.clearTimeout(id);
  }, [onDone]);

  return (
    <div className="event-countdown-dock event-countdown-dock--finale shrink-0" role="status" aria-live="polite">
      <div className="event-countdown-finale relative px-3 py-3 sm:py-3.5">
        <button
          type="button"
          onClick={onDone}
          aria-label="סגירה"
          className={cn(
            "absolute end-2 top-2 z-10 inline-flex size-8 touch-manipulation items-center justify-center rounded-full",
            "bg-black/40 text-orange-100/90 ring-1 ring-orange-400/30 backdrop-blur-sm",
            "transition active:scale-95 hover:bg-black/55",
          )}
        >
          <X className="size-4" />
        </button>

        <div className="mx-auto flex max-w-lg flex-col items-center gap-1 pe-8 ps-2 text-center">
          <p className="event-countdown-finale__emoji text-2xl leading-none" aria-hidden>
            🎃
          </p>
          <p className="font-display text-lg leading-tight text-orange-300 sm:text-xl">
            הגיע הזמן!
          </p>
          <p className="text-sm font-medium text-violet-200/95 sm:text-base">
            ליל האלווין בשכונה — טובים לצאת למפה
          </p>
        </div>

        <div
          className="event-countdown-finale__progress mt-3 h-0.5 overflow-hidden rounded-full bg-orange-950/80"
          style={{ "--countdown-finale-ms": `${FINALE_MS}ms` } as CSSProperties}
        >
          <div className="event-countdown-finale__progress-bar h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500" />
        </div>
      </div>
    </div>
  );
}
