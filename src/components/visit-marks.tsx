import { Check } from "lucide-react";
import { DecorMark } from "@/components/decor-glyphs";
import { ClosedSign, PauseSign } from "@/components/house-tags";
import { VisitedCheck } from "@/components/visited-check";
import { SkipIcon } from "@/components/skip-icon";
import { visitShort } from "@/lib/labels";
import { cn } from "@/lib/utils";

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

/** Rose disc — saved / שמורים. */
export function LikedSign({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e11d48] text-[#fff7ed]",
        className,
      )}
      title="שמורים"
      aria-label="שמורים"
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
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LikedSign />
      {labeled ? <span>שמורים</span> : <span className="sr-only">שמורים</span>}
    </span>
  );
}

/** Indigo disc — unused elsewhere. Not yet visited. */
export function UnvisitedSign({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#4f46e5] text-[#fff7ed]",
        className,
      )}
      title="לא ביקרתי"
      aria-label="לא ביקרתי"
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
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <UnvisitedSign />
      {labeled ? <span>לא ביקרתי</span> : <span className="sr-only">לא ביקרתי</span>}
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
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <ClosedSign />
      {labeled ? <span>סגור</span> : <span className="sr-only">סגור</span>}
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
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <PauseSign />
      {labeled ? <span>הפסקה</span> : <span className="sr-only">הפסקה</span>}
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
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <DecorMark level="mild" />
      {labeled ? <span>{visitShort.decorOnly}</span> : <span className="sr-only">{visitShort.decorOnly}</span>}
    </span>
  );
}

/** Green disc — visited / ביקרתי (filter row size). */
export function VisitedSign({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white",
        className,
      )}
      title="ביקרתי"
      aria-label="ביקרתי"
    >
      <Check className="size-5" strokeWidth={3} />
    </span>
  );
}

/** Slate disc — skipped / דילגתי (filter row size). */
export function SkipSign({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#fff7ed] bg-[#64748b] text-white shadow-[0_1px_2px_rgba(0,0,0,0.45)]",
        className,
      )}
      title="דילגתי"
      aria-label="דילגתי"
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

export function SkippedMark({
  labeled = false,
  className,
}: {
  labeled?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <SkipSign />
      {labeled ? <span>דילגתי</span> : <span className="sr-only">דילגתי</span>}
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
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <VisitedSign />
      {labeled ? <span>ביקרתי</span> : <span className="sr-only">ביקרתי</span>}
    </span>
  );
}
