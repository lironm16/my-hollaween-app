"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { EventCountdownParts } from "@/lib/event-countdown";
import { config } from "@/lib/config";

/** Glowing lanterns — matches reference countdown art. */
const HERO_IMAGE = "/images/stubs/lantern-path.jpg";

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
      className="event-countdown-screen fixed inset-0 z-[2000] flex h-dvh max-h-dvh flex-col overflow-hidden bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="ספירה לאחור לליל האלווין"
    >
      <div className="relative z-20 flex shrink-0 items-center justify-between border-b border-orange-500/30 bg-orange-500 px-4 py-2.5 pt-[max(0.5rem,env(safe-area-inset-top,0px))]">
        <button
          type="button"
          onClick={onClose}
          aria-label="סגירה"
          className="inline-flex size-10 touch-manipulation items-center justify-center rounded-lg text-black/70 hover:bg-black/10"
        >
          <X className="size-5" />
        </button>
        <span className="font-display text-lg text-black">ספירה לאחור</span>
        <span className="size-10" aria-hidden />
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/35 to-black/80"
          aria-hidden
        />

        <div className="absolute inset-0 flex flex-col items-center px-4 pb-6 pt-[clamp(1.5rem,8vh,4rem)] text-center">
          {welcome ? (
            <p className="mb-4 max-w-md shrink-0 text-base leading-snug text-violet-100 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              <span className="font-display text-lg text-orange-300">ברוכים הבאים!</span>
              {" · "}
              עוד {parts.days} ימים · {parts.time}
            </p>
          ) : null}

          <div
            className="flex w-full max-w-2xl shrink-0 flex-col items-center"
            aria-live="polite"
            aria-atomic="true"
          >
            <div dir="ltr">
              <p className="font-creepster text-[clamp(4rem,22vw,8rem)] tabular-nums leading-[0.9] tracking-wide text-orange-400 drop-shadow-[0_0_32px_rgba(249,115,22,0.75)]">
                {parts.days} {dayLabel}
              </p>
              <p className="mt-2 font-creepster text-[clamp(3rem,16vw,5.75rem)] tabular-nums leading-none tracking-[0.18em] text-orange-400 drop-shadow-[0_0_24px_rgba(249,115,22,0.65)]">
                {parts.time}
              </p>
            </div>
            <div className="mt-6 max-w-md space-y-1" dir="rtl">
              <p className="font-display text-[clamp(1.125rem,4.5vw,1.5rem)] text-orange-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                {config.brandEn} · {config.brandHe}
              </p>
              <p className="text-[clamp(0.95rem,3.6vw,1.2rem)] text-violet-100 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                {config.neighborhood}
              </p>
            </div>
          </div>

          <p className="mt-auto max-w-md shrink-0 pt-6 text-base leading-snug text-orange-100 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] sm:text-lg">
            עד 17:00 · 31 באוקטובר · תחילת הערב בשכונה
          </p>
        </div>
      </div>

      <div className="relative z-30 shrink-0 border-t border-orange-500/30 bg-orange-500 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
        <button
          type="button"
          onClick={onClose}
          className="flex w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-black/20 py-3.5 text-lg font-semibold text-black active:bg-black/35"
        >
          <X className="size-5" aria-hidden />
          סגירה
        </button>
      </div>
    </div>,
    document.body,
  );
}
