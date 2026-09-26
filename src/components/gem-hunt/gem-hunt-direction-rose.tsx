"use client";

import { Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

function bearingToSectorIndex(bearingDeg: number) {
  const d = ((bearingDeg % 360) + 360) % 360;
  return Math.round(d / 45) % 8;
}

/** Eight fixed arrows on a ring — one lit for walk direction. */
export function GemHuntDirectionRose({
  bearingDeg,
  facing = false,
  className,
  size = "ring",
}: {
  bearingDeg: number;
  facing?: boolean;
  className?: string;
  size?: "ring" | "footer";
}) {
  const active = bearingToSectorIndex(bearingDeg);

  return (
    <div
      className={cn(
        "gem-hunt-direction-rose",
        size === "footer" && "gem-hunt-direction-rose--footer",
        className,
      )}
      role="img"
      aria-label="כיוון הליכה — חץ דולק"
    >
      {Array.from({ length: 8 }, (_, i) => (
        <span
          key={i}
          className={cn(
            "gem-hunt-direction-rose__spoke",
            i === active && "is-active",
            i === active && facing && "is-facing",
          )}
          style={{ transform: `rotate(${i * 45}deg)` }}
          aria-hidden
        >
          <Navigation className="gem-hunt-direction-rose__icon" strokeWidth={2.4} />
        </span>
      ))}
    </div>
  );
}
