import { Check, Gem, Heart, Save } from "lucide-react";
import { cn } from "@/lib/utils";

/** Pink heart in ring — matches house-card traffic pills (icon only). */
export function SavedTrafficIcon({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#fb7185]/20 ring-1 ring-[#fb7185]/35",
        className,
      )}
      title="אהבתי"
      aria-label="אהבתי"
    >
      <Heart className={cn("size-5 fill-current text-[#fb7185]", markClassName)} strokeWidth={2.2} />
    </span>
  );
}

/** Orange gem disc — collected diamond for action menu. */
export function GemTrafficIcon({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-500/20 ring-1 ring-orange-400/40",
        className,
      )}
      title="יהלום"
      aria-label="יהלום"
    >
      <Gem className={cn("size-5 fill-current text-orange-300", markClassName)} strokeWidth={2.1} />
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
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20 ring-1 ring-violet-300/45",
        className,
      )}
      title="שמירה"
      aria-hidden
    >
      <Save className={cn("size-[1.15rem] text-violet-100", markClassName)} strokeWidth={2.25} />
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
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white",
        className,
      )}
      title="ביקרתי"
      aria-label="ביקרתי"
    >
      <Check className={cn("size-5", markClassName)} strokeWidth={markStrokeWidth} />
    </span>
  );
}
