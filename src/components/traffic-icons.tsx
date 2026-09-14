import { Check, Heart } from "lucide-react";
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
      title="שמורים"
      aria-label="שמורים"
    >
      <Heart className={cn("size-5 fill-current text-[#fb7185]", markClassName)} strokeWidth={2.2} />
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
