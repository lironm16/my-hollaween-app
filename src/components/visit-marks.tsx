"use client";

import { Check, Filter } from "lucide-react";
import { ImpMarkerGlyph } from "@/components/imp-marker-glyph";
import { DecorMark } from "@/components/decor-glyphs";
import { ClosedSign, PauseSign } from "@/components/house-tags";
import { SkipIcon } from "@/components/skip-icon";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";

function HeartGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="h-full w-full">
      <path
        fill="currentColor"
        d="M12 20.6 4.7 13.4C2.4 11.1 2.6 7.4 5.5 5.6c2.1-1.3 4.8-.7 6.5 1.4 1.7-2.1 4.4-2.7 6.5-1.4 2.9 1.8 3.1 5.5.8 7.8z"
      />
    </svg>
  );
}

function HouseGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="h-full w-full">
      <path
        fill="currentColor"
        d="M4.2 11.4 12 4.2l7.8 7.2v8.1c0 .7-.6 1.3-1.3 1.3h-4.1v-5.4h-4.8v5.4H5.5c-.7 0-1.3-.6-1.3-1.3z"
      />
    </svg>
  );
}

/** Rose disc — saved / אהבתי. */
export function LikedSign({ className }: { className?: string }) {
  const { t } = useLocale();
  const label = t("visitMarks.liked");
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e11d48] text-[#fff7ed]",
        className,
      )}
      title={label}
      aria-label={label}
    >
      <span className="size-[62%]">
        <HeartGlyph />
      </span>
    </span>
  );
}

export function LikedMark({
  labeled = false,
  className,
}: {
  labeled?: boolean;
  className?: string;
}) {
  const { t } = useLocale();
  const label = t("visitMarks.liked");
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LikedSign />
      {labeled ? <span>{label}</span> : <span className="sr-only">{label}</span>}
    </span>
  );
}

/** Indigo disc — unused elsewhere. Not yet visited. */
export function UnvisitedSign({ className }: { className?: string }) {
  const { t } = useLocale();
  const label = t("visitMarks.unvisited");
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#4f46e5] text-[#fff7ed]",
        className,
      )}
      title={label}
      aria-label={label}
    >
      <span className="size-[70%]">
        <HouseGlyph />
      </span>
    </span>
  );
}

export function UnvisitedMark({
  labeled = false,
  className,
}: {
  labeled?: boolean;
  className?: string;
}) {
  const { t } = useLocale();
  const label = t("visitMarks.unvisited");
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <UnvisitedSign />
      {labeled ? <span>{label}</span> : <span className="sr-only">{label}</span>}
    </span>
  );
}

export function ClosedMark({
  labeled = false,
  className,
}: {
  labeled?: boolean;
  className?: string;
}) {
  const { t } = useLocale();
  const label = t("visitMarks.closed");
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <ClosedSign />
      {labeled ? <span>{label}</span> : <span className="sr-only">{label}</span>}
    </span>
  );
}

export function OnBreakMark({
  labeled = false,
  className,
}: {
  labeled?: boolean;
  className?: string;
}) {
  const { t } = useLocale();
  const label = t("visitMarks.pause");
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <PauseSign />
      {labeled ? <span>{label}</span> : <span className="sr-only">{label}</span>}
    </span>
  );
}

export function DecorOnlyMark({
  labeled = false,
  className,
}: {
  labeled?: boolean;
  className?: string;
}) {
  const { t } = useLocale();
  const label = t("visitMarks.decorOnly");
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <DecorMark level="mild" />
      {labeled ? <span>{label}</span> : <span className="sr-only">{label}</span>}
    </span>
  );
}

/** Green disc — visited / ביקרתי (filter row size). */
export function VisitedSign({ className }: { className?: string }) {
  const { t } = useLocale();
  const label = t("visitMarks.visited");
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white",
        className,
      )}
      title={label}
      aria-label={label}
    >
      <Check className="size-5" strokeWidth={3} />
    </span>
  );
}

/** Orange disc — filtered / מסונן (filter row size). */
export function FilterSign({ className }: { className?: string }) {
  const { t } = useLocale();
  const label = t("visitMarks.filtered");
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-black shadow-[0_1px_2px_rgba(0,0,0,0.35)]",
        className,
      )}
      title={label}
      aria-label={label}
    >
      <Filter className="size-4" strokeWidth={2.5} />
    </span>
  );
}

/** Slate disc — skipped / דילגתי (filter row size). */
export function SkipSign({ className }: { className?: string }) {
  const { t } = useLocale();
  const label = t("visitMarks.skipped");
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#64748b] text-white shadow-[0_1px_2px_rgba(0,0,0,0.45)]",
        className,
      )}
      title={label}
      aria-label={label}
    >
      <SkipIcon className="size-5" />
    </span>
  );
}

export function SkipPinBadge({
  className,
  size = "map",
}: {
  className?: string;
  size?: "map" | "list";
}) {
  return (
    <span
      className={cn("skip-pin-badge", size === "list" && "is-list", className)}
      aria-hidden="true"
    >
      <SkipIcon className="skip-pin-badge-icon" />
    </span>
  );
}

/** Amber filled imp — מצאתי (matches LikedSign / VisitedSign size-8). */
export function CollectedGemSign({ className }: { className?: string }) {
  const { t } = useLocale();
  const label = t("visitMarks.gemFound");
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20 ring-1 ring-amber-400/45",
        className,
      )}
      title={label}
      aria-label={label}
    >
      <ImpMarkerGlyph variant="solid" className="size-[88%] text-[#fbbf24]" />
    </span>
  );
}

function UncollectedGemSign({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20 ring-1 ring-amber-400/45",
        className,
      )}
      aria-hidden
    >
      <ImpMarkerGlyph variant="eyes" className="size-[88%] text-[#fbbf24]" />
    </span>
  );
}

export function UncollectedGemMark({
  labeled = false,
  className,
}: {
  labeled?: boolean;
  className?: string;
}) {
  const { t } = useLocale();
  const label = t("visitMarks.gemNotFound");
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <UncollectedGemSign />
      {labeled ? <span>{label}</span> : <span className="sr-only">{label}</span>}
    </span>
  );
}

export function CollectedGemMark({
  labeled = false,
  className,
}: {
  labeled?: boolean;
  className?: string;
}) {
  const { t } = useLocale();
  const label = t("visitMarks.gemFound");
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <CollectedGemSign />
      {labeled ? <span>{label}</span> : <span className="sr-only">{label}</span>}
    </span>
  );
}

export function SkippedMark({
  labeled = false,
  className,
}: {
  labeled?: boolean;
  className?: string;
}) {
  const { t } = useLocale();
  const label = t("visitMarks.skipped");
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <SkipSign />
      {labeled ? <span>{label}</span> : <span className="sr-only">{label}</span>}
    </span>
  );
}

export function VisitedMark({
  labeled = false,
  className,
}: {
  labeled?: boolean;
  className?: string;
}) {
  const { t } = useLocale();
  const label = t("visitMarks.visited");
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <VisitedSign />
      {labeled ? <span>{label}</span> : <span className="sr-only">{label}</span>}
    </span>
  );
}
