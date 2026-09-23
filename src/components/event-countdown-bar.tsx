"use client";

import type { EventCountdownParts } from "@/lib/event-countdown";
import { cn } from "@/lib/utils";

export function EventCountdownBar({
  parts,
  onClick,
  className,
}: {
  parts: EventCountdownParts;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${parts.label} until Halloween night`}
      className={cn(
        "event-countdown-bar flex w-full min-w-0 items-center justify-center border-0 bg-transparent px-3 transition-colors hover:bg-orange-950/25",
        className,
      )}
      dir="ltr"
    >
      <span
        className="event-countdown-bar__text inline-flex max-w-full items-baseline justify-center gap-0 whitespace-nowrap font-creepster tabular-nums tracking-wide text-orange-400 [text-shadow:0_0_10px_rgba(251,146,60,0.35)]"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="shrink-0">
          {parts.days} {parts.days === 1 ? "Day" : "Days"} ·
        </span>
        <span className="event-countdown-bar__clock ms-1 shrink-0 tracking-widest">{parts.time}</span>
      </span>
    </button>
  );
}
