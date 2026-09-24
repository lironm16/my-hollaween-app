"use client";

import { Gem } from "lucide-react";
import type { GemFabGlow } from "@/lib/gem-hunt-target";
import { cn } from "@/lib/utils";

export function MapGemHuntFab({
  onClick,
  glow = "off",
  nearGem = false,
  disabled,
  collectedCount = 0,
}: {
  onClick: () => void;
  glow?: GemFabGlow;
  /** Legacy: treated as approach glow when glow is off */
  nearGem?: boolean;
  disabled?: boolean;
  /** Collected gems — badge hidden when 0 */
  collectedCount?: number;
}) {
  const level: GemFabGlow = glow !== "off" ? glow : nearGem ? "approach" : "off";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "map-gem-hunt-fab inline-flex size-14 items-center justify-center rounded-full bg-violet-700 text-amber-200 shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-1 ring-violet-400/50 hover:bg-violet-600 disabled:opacity-45",
        level === "approach" && "is-near",
        level === "hunt" && "is-hunt",
      )}
      aria-label="חיפוש יהלום נסתר"
      title={
        level === "hunt"
          ? "בטווח איסוף — פתחו מצלמה!"
          : level === "approach"
            ? "יהלום קרוב — התקרבו לבית"
            : "חיפוש יהלום נסתר"
      }
    >
      <span className="map-gem-hunt-fab__pulse" aria-hidden />
      <Gem className="relative z-[1] size-8 drop-shadow-[0_0_8px_rgb(251_191_36/0.85)]" strokeWidth={2.1} aria-hidden />
      {collectedCount > 0 ? (
        <span className="map-gem-hunt-fab__badge" aria-label={`${collectedCount} יהלומים`}>
          {collectedCount > 99 ? "99+" : collectedCount}
        </span>
      ) : null}
    </button>
  );
}
