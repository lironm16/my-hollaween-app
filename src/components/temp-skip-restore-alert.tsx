"use client";

import { X } from "lucide-react";

export type TempSkipRestoreAlert = {
  id: string;
  message: string;
};

export function TempSkipRestoreAlerts({
  alerts,
  onDismiss,
}: {
  alerts: TempSkipRestoreAlert[];
  onDismiss: (id: string) => void;
}) {
  if (alerts.length === 0) return null;
  return (
    <div className="relative z-30 space-y-1">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          role="status"
          className="flex items-center justify-between gap-3 bg-emerald-950/90 px-3 py-2 text-base text-emerald-50 ring-1 ring-inset ring-emerald-500/25"
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
    </div>
  );
}
