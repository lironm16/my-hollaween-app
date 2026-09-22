"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, X } from "lucide-react";
import type { RouteStatusChangeEntry } from "@/lib/route-changes";

export function routeChangeBannerMessage(changes: RouteStatusChangeEntry[]): string {
  if (changes.length === 1) {
    const only = changes[0]!;
    return `${only.name} — ${only.reason}`;
  }
  return `${changes.length} בתים במסלול השתנו · הקישו לפרטים`;
}

export function RouteChangeBanner({
  changes,
  onOpen,
  onDismiss,
}: {
  changes: RouteStatusChangeEntry[];
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || changes.length === 0) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+7.25rem)] z-[55] px-3"
      dir="rtl"
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-xl bg-amber-950/95 px-3 py-2.5 text-base text-amber-50 shadow-[0_10px_30px_rgba(0,0,0,0.45)] ring-1 ring-amber-500/35 backdrop-blur-sm">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-right leading-snug"
          onClick={onOpen}
        >
          <span className="min-w-0 flex-1">{routeChangeBannerMessage(changes)}</span>
          <ChevronLeft className="size-4 shrink-0 opacity-80" aria-hidden />
        </button>
        <button
          type="button"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-amber-100/90 hover:bg-amber-900/60"
          aria-label="סגירת ההודעה"
          onClick={onDismiss}
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>,
    document.body,
  );
}
