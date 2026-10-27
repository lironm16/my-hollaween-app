"use client";

import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";

function bearingToSectorIndex(bearingDeg: number) {
  const d = ((bearingDeg % 360) + 360) % 360;
  return Math.round(d / 45) % 8;
}

/** Eight chevrons on the hunt ring — one lit for walk direction. */
export function GemHuntDirectionRose({
  bearingDeg,
  facing = false,
  className,
}: {
  bearingDeg: number;
  facing?: boolean;
  className?: string;
}) {
  const { t } = useLocale();
  const active = bearingToSectorIndex(bearingDeg);

  return (
    <div
      className={cn("gem-hunt-direction-rose", className)}
      role="img"
      aria-label={t("gem.walkRoseAria")}
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
          <svg
            className="gem-hunt-direction-rose__chevron"
            viewBox="0 0 56 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M28 1 L54 17 L42 17 L42 21 L14 21 L14 17 L2 17 Z"
              fill="currentColor"
            />
          </svg>
        </span>
      ))}
    </div>
  );
}
