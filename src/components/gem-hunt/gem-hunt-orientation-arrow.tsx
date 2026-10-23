"use client";

import { Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

/** Phone-relative walk needle in the scan ring (Lucide Navigation — original gem cam compass). */
export function GemHuntOrientationArrow({
  bearingDeg,
  facing = false,
  mapNorth = false,
  className,
}: {
  bearingDeg: number;
  facing?: boolean;
  mapNorth?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "gem-hunt-overlay__scan-compass",
        mapNorth && "gem-hunt-overlay__scan-compass--map-north",
        facing && "is-facing",
        className,
      )}
      dir="ltr"
      style={{ transform: `translate(-50%, -50%) rotate(${bearingDeg}deg)` }}
      role="img"
      aria-label="כיוון הליכה — מחט מצפן"
    >
      <Navigation className="gem-hunt-overlay__scan-compass-icon" strokeWidth={2.5} aria-hidden />
    </div>
  );
}
