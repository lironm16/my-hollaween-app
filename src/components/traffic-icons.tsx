"use client";

import { Check, Heart, Save } from "lucide-react";
import { ImpMarkerGlyph } from "@/components/imp-marker-glyph";
import { SkipIcon } from "@/components/skip-icon";
import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";

/** Pink heart in ring — matches house-card traffic pills (icon only). */
export function SavedTrafficIcon({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  const { t } = useLocale();
  const label = t("traffic.liked");
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#fb7185]/20 ring-1 ring-[#fb7185]/35",
        className,
      )}
      title={label}
      aria-label={label}
    >
      <Heart className={cn("size-5 fill-current text-[#fb7185]", markClassName)} strokeWidth={2.2} />
    </span>
  );
}

/** Imp in disc — collected / action menu (matches heart & visited scale). */
export function GemTrafficIcon({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  const { t } = useLocale();
  const label = t("traffic.imp");
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/25 ring-1 ring-amber-400/45",
        className,
      )}
      title={label}
      aria-label={label}
    >
      <ImpMarkerGlyph
        variant="solid"
        className={cn("size-[1.55rem] max-h-full max-w-full text-current", markClassName)}
      />
    </span>
  );
}

/** Outline-style imp disc — ⋮ menu when imp not yet found. */
export function GemMenuDiscIcon({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  const { t } = useLocale();
  const label = t("traffic.imp");
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20 ring-1 ring-amber-400/45",
        className,
      )}
      title={label}
      aria-hidden
    >
      <ImpMarkerGlyph
        variant="eyes"
        className={cn("size-[1.55rem] max-h-full max-w-full text-current", markClassName)}
      />
    </span>
  );
}

/** Violet floppy-save disc — export / download list (matches traffic pill style). */
export function SaveExportTrafficIcon({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  const { t } = useLocale();
  const label = t("traffic.save");
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20 ring-1 ring-violet-300/45",
        className,
      )}
      title={label}
      aria-hidden
    >
      <Save className={cn("size-[1.15rem] text-violet-100", markClassName)} strokeWidth={2.25} />
    </span>
  );
}

/** Skip disc — ⋮ menu when skipped (same as card banner SkipSign). */
export function SkipTrafficIcon({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  const { t } = useLocale();
  const label = t("traffic.skip");
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#64748b] text-white shadow-[0_1px_2px_rgba(0,0,0,0.45)]",
        className,
      )}
      title={label}
      aria-label={label}
    >
      <SkipIcon className={cn("size-5", markClassName)} />
    </span>
  );
}

/** Green check disc — matches house-card traffic pills (icon only). */
export function VisitedTrafficIcon({
  className,
  markClassName,
  markStrokeWidth = 3.5,
}: {
  className?: string;
  markClassName?: string;
  markStrokeWidth?: number;
}) {
  const { t } = useLocale();
  const label = t("traffic.visited");
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white",
        className,
      )}
      title={label}
      aria-label={label}
    >
      <Check className={cn("size-5", markClassName)} strokeWidth={markStrokeWidth} />
    </span>
  );
}
