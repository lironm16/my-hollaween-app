"use client";

import { bearingClockLabel } from "@/lib/gem-hunt";
import { formatDistance } from "@/lib/geo";
import { useGemCopy } from "@/hooks/use-gem-copy";
import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";

/** Map-north compass dial — works without iPhone motion/orientation permission. */
export function GpsBearingDial({
  bearingDeg,
  distanceM,
  className,
  compact = false,
}: {
  bearingDeg: number;
  distanceM?: number | null;
  className?: string;
  compact?: boolean;
}) {
  const { locale, t } = useLocale();
  const gemCopy = useGemCopy();
  const label = bearingClockLabel(bearingDeg, locale);
  const distanceSuffix = distanceM != null ? `, ${formatDistance(distanceM, locale)}` : "";

  return (
    <div
      className={cn("gps-bearing-dial", compact && "gps-bearing-dial--compact", className)}
      role="img"
      aria-label={gemCopy.bearingAria(label, distanceSuffix)}
    >
      <svg viewBox="0 0 120 120" className="gps-bearing-dial__svg" aria-hidden>
        <circle cx="60" cy="60" r="54" className="gps-bearing-dial__ring" />
        <circle cx="60" cy="60" r="46" className="gps-bearing-dial__inner" />
        <text x="60" y="16" textAnchor="middle" className="gps-bearing-dial__n">
          {t("gem.bearingDialNorthMark")}
        </text>
        <g transform={`rotate(${bearingDeg} 60 60)`}>
          <path d="M60 28 L68 52 L60 48 L52 52 Z" className="gps-bearing-dial__arrow" />
          <line x1="60" y1="48" x2="60" y2="72" className="gps-bearing-dial__stem" />
        </g>
        <circle cx="60" cy="60" r="5" className="gps-bearing-dial__hub" />
      </svg>
      <p className="gps-bearing-dial__label">
        {label}
        {distanceM != null ? ` · ~${formatDistance(distanceM, locale)}` : null}
      </p>
      {!compact ? <p className="gps-bearing-dial__hint">{t("gem.bearingDialHint")}</p> : null}
    </div>
  );
}
