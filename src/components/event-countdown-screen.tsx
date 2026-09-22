"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { EventCountdownParts } from "@/lib/event-countdown";
import { cn } from "@/lib/utils";

function LanternArt() {
  return (
    <div
      className="relative mx-auto mt-5 h-32 w-full max-w-[min(100%,240px)] overflow-hidden rounded-2xl bg-[#0a0610] ring-1 ring-orange-500/25"
      aria-hidden
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,146,60,0.4),transparent_72%)]" />
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-4">
        {["🐱", "🏠", "🦇"].map((icon) => (
          <div
            key={icon}
            className="flex size-14 items-center justify-center rounded-xl bg-orange-500 shadow-[0_0_24px_rgba(251,146,60,0.65)]"
          >
            <span className="text-xl grayscale contrast-200 brightness-50">{icon}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EventCountdownScreen({
  open,
  parts,
  welcome,
  onClose,
}: {
  open: boolean;
  parts: EventCountdownParts;
  welcome: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const dayLabel = parts.days === 1 ? "Day" : "Days";

  return (
    <div
      className="event-countdown-screen fixed inset-0 z-[120] flex flex-col bg-[#0a0610]"
      role="dialog"
      aria-modal="true"
      aria-label="ספירה לאחור לליל האלווין"
    >
      <div className="flex items-center justify-between px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
        <button
          type="button"
          onClick={onClose}
          aria-label="סגירה"
          className="inline-flex size-10 items-center justify-center rounded-lg text-violet-300 hover:bg-orange-500/10"
        >
          <X className="size-5" />
        </button>
        <span className="font-display text-sm text-orange-200">ספירה לאחור</span>
        <span className="size-10" aria-hidden />
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
        {welcome ? (
          <div className="mb-6 w-full max-w-sm rounded-2xl bg-[#160b1f]/80 px-4 py-3 ring-1 ring-orange-500/25">
            <p className="text-center font-display text-xl text-orange-200">ברוכים הבאים!</p>
            <p className="mt-2 text-center text-base leading-relaxed text-violet-200">
              עוד {parts.days} ימים לליל האלווין בשכונה. הוסיפו את הבית, תכננו מסלול — ונתראה בערב.
            </p>
          </div>
        ) : null}

        <p
          className="font-creepster text-[clamp(2.5rem,12vw,3.75rem)] tabular-nums tracking-wide text-orange-400 [text-shadow:0_0_22px_rgba(251,146,60,0.55)]"
          dir="ltr"
        >
          {parts.days} {dayLabel}
        </p>
        <p
          className={cn(
            "mt-2 font-creepster tabular-nums tracking-[0.2em] text-orange-400/95",
            "text-[clamp(1.75rem,8vw,2.25rem)]",
          )}
          dir="ltr"
        >
          {parts.time}
        </p>
        <p className="mt-3 text-center text-sm text-violet-300">עד 17:00 · 31 באוקטובר</p>
        <p className="mt-1 text-center text-xs text-violet-400/75">תחילת הערב בשכונה</p>

        <LanternArt />
      </div>
    </div>
  );
}
