"use client";

import Image from "next/image";
import { useEffect } from "react";
import { X } from "lucide-react";
import type { EventCountdownParts } from "@/lib/event-countdown";
import { cn } from "@/lib/utils";

const HERO_IMAGE = "/images/stubs/pumpkin-porch.jpg";

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
      <div className="flex shrink-0 items-center justify-between px-4 pb-1 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
        <button
          type="button"
          onClick={onClose}
          aria-label="סגירה"
          className="inline-flex size-10 items-center justify-center rounded-lg text-violet-300 hover:bg-orange-500/10"
        >
          <X className="size-5" />
        </button>
        <span className="font-display text-base text-orange-200">ספירה לאחור</span>
        <span className="size-10" aria-hidden />
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-4 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
        {welcome ? (
          <p className="mb-3 shrink-0 text-center text-base leading-snug text-violet-200">
            <span className="font-display text-lg text-orange-200">ברוכים הבאים!</span>
            {" · "}
            עוד {parts.days} ימים לליל האלווין בשכונה — הוסיפו בית ותכננו מסלול.
          </p>
        ) : null}

        <div className="shrink-0 text-center" dir="ltr">
          <p className="font-creepster text-[clamp(3rem,14vw,4.5rem)] tabular-nums leading-none tracking-wide text-orange-400 [text-shadow:0_0_24px_rgba(251,146,60,0.55)]">
            {parts.days} {dayLabel}
          </p>
          <p
            className={cn(
              "mt-1 font-creepster tabular-nums leading-none tracking-[0.18em] text-orange-400/95",
              "text-[clamp(2rem,10vw,3rem)]",
            )}
          >
            {parts.time}
          </p>
        </div>

        <div className="relative mx-auto mt-3 min-h-0 w-full max-w-lg flex-1 overflow-hidden rounded-2xl ring-1 ring-orange-500/25">
          <Image
            src={HERO_IMAGE}
            alt=""
            fill
            priority
            sizes="(max-width: 512px) 100vw, 512px"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0610] via-transparent to-[#0a0610]/40" aria-hidden />
        </div>

        <p className="mt-3 shrink-0 text-center text-base leading-snug text-violet-300">
          עד 17:00 · 31 באוקטובר · תחילת הערב בשכונה
        </p>
      </div>
    </div>
  );
}
