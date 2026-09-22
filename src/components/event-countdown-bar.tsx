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
        "event-countdown-bar flex w-full min-w-0 items-center justify-center border-b border-orange-500/20 bg-[#12081a]/90 px-2 py-2 transition-colors hover:bg-orange-950/25",
        className,
      )}
      dir="ltr"
    >
      <span className="event-countdown-bar__text whitespace-nowrap font-creepster max-w-full text-center tabular-nums tracking-wide text-orange-400 [text-shadow:0_0_10px_rgba(251,146,60,0.35)]">
        {parts.label}
      </span>
    </button>
  );
}
