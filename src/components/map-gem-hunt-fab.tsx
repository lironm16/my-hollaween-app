"use client";

import { GemDiamondSvg } from "@/components/gem-diamond-icon";
import type { GemFabGlow } from "@/lib/gem-hunt-target";
import { GEM_DIAMOND_COLLECTED_FILL, GEM_DIAMOND_FILL } from "@/lib/gem-diamond-visual";
import {
  GEM_FAB_ALL_FOUND_ARIA_HE,
  GEM_FAB_ALL_FOUND_TITLE_HE,
  GEM_FAB_APPROACH_TITLE_HE,
  GEM_FAB_FOUND_COUNT_ARIA_HE,
  GEM_FAB_HUNT_ARIA_HE,
  GEM_FAB_HUNT_TITLE_HE,
} from "@/lib/gem-hunt-copy";
import { cn } from "@/lib/utils";

export function MapGemHuntFab({
  onClick,
  glow = "off",
  nearGem = false,
  disabled,
  allCollected = false,
  collectedCount = 0,
}: {
  onClick: () => void;
  glow?: GemFabGlow;
  nearGem?: boolean;
  disabled?: boolean;
  allCollected?: boolean;
  collectedCount?: number;
}) {
  const level: GemFabGlow = allCollected ? "off" : glow !== "off" ? glow : nearGem ? "approach" : "off";
  const fill = allCollected ? GEM_DIAMOND_COLLECTED_FILL : GEM_DIAMOND_FILL;
  return (
    <button
      type="button"
      disabled={disabled && !allCollected}
      onClick={onClick}
      className={cn(
        "map-gem-hunt-fab inline-flex size-14 items-center justify-center rounded-full bg-violet-700 text-amber-200 shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-1 ring-violet-400/50 hover:bg-violet-600 disabled:opacity-45",
        level === "approach" && "is-near",
        level === "hunt" && "is-hunt",
        allCollected && "is-complete",
      )}
      aria-label={allCollected ? GEM_FAB_ALL_FOUND_ARIA_HE : GEM_FAB_HUNT_ARIA_HE}
      title={
        allCollected
          ? GEM_FAB_ALL_FOUND_TITLE_HE
          : level === "hunt"
            ? GEM_FAB_HUNT_TITLE_HE
            : level === "approach"
              ? GEM_FAB_APPROACH_TITLE_HE
              : GEM_FAB_HUNT_ARIA_HE
      }
    >
      <span className="map-gem-hunt-fab__pulse" aria-hidden />
      <GemDiamondSvg
        className={cn(
          "relative z-[1] size-8",
          allCollected
            ? "drop-shadow-[0_0_10px_rgb(167_139_250/0.85)]"
            : "drop-shadow-[0_0_8px_rgb(251_191_36/0.85)]",
        )}
        fill={fill}
      />
      {collectedCount > 0 ? (
        <span
          className="absolute -top-1 -right-1 z-[2] inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-black px-1 text-sm font-bold leading-none text-amber-300 ring-1 ring-amber-400/45 pointer-events-none"
          aria-label={GEM_FAB_FOUND_COUNT_ARIA_HE(collectedCount)}
        >
          {collectedCount > 99 ? "99+" : collectedCount}
        </span>
      ) : null}
    </button>
  );
}
