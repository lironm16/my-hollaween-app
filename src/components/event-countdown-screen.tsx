"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { EventCountdownParts } from "@/lib/event-countdown";

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
      className="event-countdown-screen fixed inset-0 z-[2000] flex h-dvh max-h-dvh flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="ספירה לאחור לליל האלווין"
    >
      <div className="relative z-20 flex shrink-0 items-center justify-between border-b border-orange-500/30 bg-orange-500 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
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

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-black px-4 pt-4">
        {welcome ? (
          <p className="mb-3 shrink-0 text-center text-lg leading-snug text-violet-100">
            <span className="font-display text-xl text-orange-300">ברוכים הבאים!</span>
            {" · "}
            עוד {parts.days} ימים · {parts.time} לליל האלווין בשכונה.
          </p>
        ) : null}

        <div className="shrink-0 text-center" dir="ltr">
          <p className="font-creepster text-[clamp(3.25rem,15vw,5rem)] tabular-nums leading-none tracking-wide text-orange-500 [text-shadow:0_0_28px_rgba(249,115,22,0.65)]">
            {parts.days} {dayLabel}
          </p>
          <p className="mt-2 font-creepster text-[clamp(2.25rem,11vw,3.5rem)] tabular-nums leading-none tracking-[0.22em] text-orange-500 [text-shadow:0_0_20px_rgba(249,115,22,0.5)]">
            {parts.time}
          </p>
        </div>

        <div className="relative mx-auto mt-4 aspect-[4/5] w-full max-w-md shrink-0 overflow-hidden">
          <Image
            src={HERO_IMAGE}
            alt=""
            fill
            priority
            sizes="(max-width: 512px) 100vw, 448px"
            className="object-contain object-center"
          />
        </div>

        <p className="mt-4 shrink-0 pb-2 text-center text-lg leading-snug text-orange-100/90 sm:text-xl">
          עד 17:00 · 31 באוקטובר · תחילת הערב בשכונה
        </p>
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
