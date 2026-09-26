"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** Top section on the sticker bag — album progress only (no separate «diamond» count). */
export function GemBagDiamondHero({
  filledCount,
  totalSlots,
  complete,
  className,
}: {
  filledCount: number;
  totalSlots: number;
  complete: boolean;
  className?: string;
}) {
  const progressPct = totalSlots > 0 ? Math.round((filledCount / totalSlots) * 100) : 0;

  return (
    <header
      className={cn("gem-bag-hero gem-bag-diamond-hero", complete && "gem-bag-hero--complete", className)}
      dir="rtl"
    >
      <div className="gem-bag-hero__head">
        <Sparkles
          className="size-9 shrink-0 text-amber-300 drop-shadow-[0_0_12px_rgb(251_191_36/0.5)]"
          aria-hidden
        />
        <div className="min-w-0 flex-1 text-right">
          <h1 className="font-display text-2xl text-orange-200">ספר החברים</h1>
          <p className="mt-1 text-lg font-medium text-violet-50">
            <span className="text-amber-200">{filledCount}</span>
            <span className="text-violet-200/90"> חברים באלבום · </span>
            <span className="text-violet-300">עוד {Math.max(0, totalSlots - filledCount)} לגלות</span>
          </p>
        </div>
        <div className="gem-bag-progress-ring" aria-hidden>
          <span className="gem-bag-progress-ring__value">{progressPct}%</span>
        </div>
      </div>
      <div
        className="gem-bag-progress-bar"
        role="progressbar"
        aria-valuenow={progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${filledCount} מתוך ${totalSlots} חברים באלבום`}
      >
        <div className="gem-bag-progress-bar__fill" style={{ width: `${progressPct}%` }} />
      </div>
      {complete ? (
        <p className="gem-bag-hero__celebrate">
          <Sparkles className="inline size-4 text-amber-300" aria-hidden /> כל החבר&apos;ה
          באוסף — השכונה מלאה קסם!
        </p>
      ) : null}
    </header>
  );
}
