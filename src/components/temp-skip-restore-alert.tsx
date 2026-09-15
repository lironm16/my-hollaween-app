"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { TempSkipRestoreAlert } from "@/lib/temp-skip-restore-alerts";

export function TempSkipRestoreAlerts({
  alerts,
  onDismiss,
}: {
  alerts: TempSkipRestoreAlert[];
  onDismiss: (id: string) => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || alerts.length === 0) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+7.25rem)] z-[55] space-y-1 px-3"
      dir="rtl"
    >
      {alerts.map((alert) => (
        <div
          key={alert.id}
          role="status"
          className="pointer-events-auto flex items-center justify-between gap-3 rounded-xl bg-emerald-950/95 px-3 py-2.5 text-base text-emerald-50 shadow-[0_10px_30px_rgba(0,0,0,0.45)] ring-1 ring-emerald-500/30 backdrop-blur-sm"
        >
          <span className="min-w-0 flex-1 text-right leading-snug">{alert.message}</span>
          <button
            type="button"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-emerald-100/90 hover:bg-emerald-900/60"
            aria-label="סגירת ההודעה"
            onClick={() => onDismiss(alert.id)}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
