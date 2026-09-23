"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { CountdownDecor } from "@/components/countdown-decor";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import type { EventCountdownParts } from "@/lib/event-countdown";
import { eventCountdownDateBadgeLabel } from "@/lib/event-countdown-display";
import { config } from "@/lib/config";
import { isStandaloneDisplay } from "@/lib/push-client";
import { subscribeAppViewport, syncAppViewportVars } from "@/lib/viewport";
import { cn } from "@/lib/utils";

export function EventCountdownScreen({
  open,
  parts,
  onClose,
}: {
  open: boolean;
  parts: EventCountdownParts;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const sceneBodyRef = useRef<HTMLDivElement>(null);
  const sceneFitRef = useRef<HTMLDivElement>(null);
  const sceneStackRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [screenReaderHint, setScreenReaderHint] = useState("");
  const standalone = useSyncExternalStore(
    () => () => {},
    isStandaloneDisplay,
    () => false,
  );

  useFocusTrap(dialogRef, open, { inertRootId: "neighborhood-shell", initialFocus: "first" });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setScreenReaderHint("");
      return;
    }
    const dayLabel = parts.days === 1 ? "יום" : "ימים";
    setScreenReaderHint(`${parts.days} ${dayLabel}, ${parts.time}`);
  }, [open, parts.days, parts.time]);

  useLayoutEffect(() => {
    if (!open) return;
    const body = sceneBodyRef.current;
    const fit = sceneFitRef.current;
    const stack = sceneStackRef.current;
    if (!body || !fit || !stack) return;

    let raf = 0;
    const fitStack = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        fit.style.height = "";
        stack.style.transform = "";
        const available = body.clientHeight;
        const needed = stack.scrollHeight;
        if (needed > available && available > 0) {
          const scale = Math.max(0.68, available / needed);
          fit.style.height = `${Math.ceil(needed * scale)}px`;
          stack.style.transform = `scale(${scale})`;
        }
      });
    };

    fitStack();
    const ro = new ResizeObserver(fitStack);
    ro.observe(body);
    ro.observe(stack);
    const unsubViewport = subscribeAppViewport(fitStack);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      unsubViewport();
    };
  }, [open, parts.days, parts.time]);

  useEffect(() => {
    if (!open) return;
    syncAppViewportVars();
    const unsubViewport = subscribeAppViewport();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      unsubViewport();
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const dayLabel = parts.days === 1 ? "Day" : "Days";

  return createPortal(
    <div
      ref={dialogRef}
      className={cn(
        "event-countdown-screen fixed inset-0 z-[2000] flex flex-col overflow-hidden bg-[#2e2248]",
        standalone ? "event-countdown-screen--standalone" : "event-countdown-screen--browser",
      )}
      style={{
        height: "var(--app-h, 100dvh)",
        maxHeight: "var(--app-h, 100dvh)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="ספירה לאחור לליל האלווין"
      tabIndex={-1}
    >
      {screenReaderHint ? (
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {screenReaderHint}
        </p>
      ) : null}

      <div className="countdown-scene-bg relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <CountdownDecor />
        <div className="countdown-scene-moon" aria-hidden />

        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="סגירה"
          className="countdown-scene-close absolute end-3 top-[max(0.5rem,env(safe-area-inset-top,0px))] z-50 inline-flex size-10 touch-manipulation items-center justify-center rounded-full bg-black/45 text-orange-100 ring-1 ring-orange-400/35 backdrop-blur-sm"
        >
          <X className="size-5" />
        </button>

        <div
          ref={sceneBodyRef}
          className="countdown-scene-body absolute inset-0 z-10 flex min-h-0 flex-col items-center overflow-hidden px-4 text-center"
        >
          <div ref={sceneFitRef} className="countdown-scene-fit">
            <div ref={sceneStackRef} className="countdown-scene-stack flex w-full max-w-lg flex-col items-center">
            <div className="countdown-scene-header flex w-full flex-col items-center">
              <p className="countdown-hebrew-line countdown-welcome-line">ברוכים הבאים ל</p>
              <p className="countdown-plain-title countdown-brand-en">{config.brandEn}</p>
            </div>

            <div className="countdown-wood-sign relative w-full max-w-md px-4 sm:px-6">
              <span className="countdown-web countdown-web--tl" aria-hidden />
              <span className="countdown-web countdown-web--tr" aria-hidden />
              <span className="countdown-web countdown-web--bl" aria-hidden />
              <span className="countdown-web countdown-web--br" aria-hidden />

              <div dir="ltr" className="relative z-[1]" aria-hidden="true">
                <p className="countdown-plain-number countdown-days-number tabular-nums leading-[0.88]">
                  {parts.days} {dayLabel}
                </p>
                <p className="countdown-plain-number countdown-time-number tabular-nums leading-none tracking-[0.14em]">
                  {parts.time}
                </p>
              </div>

              <div className="countdown-sign-copy relative z-[1]" dir="rtl">
                <p className="countdown-brand-he countdown-brand-he-size leading-tight">{config.brandHe}</p>
                <p className="countdown-neighborhood-line font-medium text-orange-100/90">{config.neighborhood}</p>
                <p className="countdown-event-line font-medium text-violet-200/85">תחילת הערב בשכונה</p>
              </div>
            </div>

            <div className="countdown-footer-cluster flex w-full max-w-md flex-col items-center">
              <div className="countdown-date-badge font-bold text-white">{eventCountdownDateBadgeLabel()}</div>

              <button
                type="button"
                onClick={onClose}
                className={cn(
                  "countdown-neon-arrow flex touch-manipulation flex-col items-center",
                  "text-orange-300 transition active:scale-95",
                )}
              >
                <span className="countdown-close-label font-semibold text-orange-100/90">סגירה · חזרה למפה</span>
                <ChevronDown className="countdown-close-chevron animate-bounce" strokeWidth={2.5} aria-hidden />
              </button>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
