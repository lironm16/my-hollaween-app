"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { CountdownDecor } from "@/components/countdown-decor";
import type { EventCountdownParts } from "@/lib/event-countdown";
import { config } from "@/lib/config";

export function EventCountdownScreen({
  open,
  parts,
  onClose,
}: {
  open: boolean;
  parts: EventCountdownParts;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const dayLabel = parts.days === 1 ? "Day" : "Days";

  return createPortal(
    <div
      className="event-countdown-screen fixed inset-0 z-[2000] flex h-dvh max-h-dvh flex-col overflow-hidden bg-[#0a0610]"
      role="dialog"
      aria-modal="true"
      aria-label="ספירה לאחור לליל האלווין"
    >
      <div className="countdown-scene-bg relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <CountdownDecor />

        <button
          type="button"
          onClick={onClose}
          aria-label="סגירה · חזרה למפה"
          className="countdown-scene-close absolute end-3 top-[max(0.5rem,env(safe-area-inset-top,0px))] z-30 inline-flex size-10 touch-manipulation items-center justify-center rounded-full bg-black/45 text-orange-100 ring-1 ring-orange-400/35 backdrop-blur-sm"
        >
          <X className="size-5" />
        </button>

        <div className="countdown-scene-body absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 overflow-y-auto px-3 py-[max(2.75rem,env(safe-area-inset-top,0px)+1.75rem)] pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] text-center">
          <div className="flex w-full max-w-lg shrink-0 flex-col items-center gap-0.5">
            <p className="countdown-hebrew-line text-[clamp(1rem,4.5vw,1.45rem)]">ברוכים הבאים ל</p>
            <p className="countdown-plain-title text-[clamp(2rem,11vw,3.25rem)]">{config.brandEn}</p>
          </div>

          <div
            className="countdown-wood-sign relative w-full max-w-md shrink-0 px-3 py-3 sm:px-5 sm:py-4"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="countdown-web countdown-web--tl" aria-hidden />
            <span className="countdown-web countdown-web--tr" aria-hidden />
            <span className="countdown-web countdown-web--bl" aria-hidden />
            <span className="countdown-web countdown-web--br" aria-hidden />

            <div dir="ltr" className="relative z-[1]">
              <p className="countdown-plain-number text-[clamp(3.25rem,20vw,6.5rem)] tabular-nums leading-[0.9]">
                {parts.days} {dayLabel}
              </p>
              <p className="countdown-plain-number mt-0.5 text-[clamp(2.25rem,13vw,4.25rem)] tabular-nums leading-none tracking-[0.12em]">
                {parts.time}
              </p>
            </div>

            <div className="relative z-[1] mt-2 space-y-0.5" dir="rtl">
              <p className="countdown-brand-he text-[clamp(1.35rem,6vw,2.1rem)] leading-tight">
                {config.brandHe}
              </p>
              <p className="text-[clamp(0.875rem,3.4vw,1.05rem)] font-medium text-orange-100/90">
                {config.neighborhood}
              </p>
              <p className="text-[clamp(0.8rem,3vw,0.95rem)] font-medium text-violet-200/85">
                תחילת הערב בשכונה
              </p>
            </div>
          </div>

          <div className="countdown-date-badge shrink-0 px-4 py-1.5 text-[clamp(0.9rem,3.6vw,1.15rem)] font-bold text-white">
            17:00 · 31.10
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
