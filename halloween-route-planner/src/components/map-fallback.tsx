"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { AlertTriangle, RefreshCw } from "lucide-react";

type MapFallbackProps = {
  fallbackUrl: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  usageInfo?: {
    usage: number;
    limit: number;
    remaining: number;
  };
};

export function MapFallback({
  fallbackUrl,
  onRetry,
  isRetrying = false,
  usageInfo,
}: MapFallbackProps) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-6 rounded-3xl border border-dashed border-white/20 bg-white/5 p-6 text-center text-sm text-slate-200/80">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl opacity-30">
        <Image
          src={fallbackUrl}
          alt="מפת מצב שמורה"
          fill
          className="object-cover"
        />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-400/15 text-amber-200">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <h3 className="text-lg font-semibold text-white">
          מצב חסכוני — מוצגת תמונת מפה עדכנית
        </h3>
        <p className="max-w-md text-sm text-slate-200/80">
          צריכת המפות בחודש הנוכחי כמעט הגיעה למגבלה. הצגנו צילום עדכני כדי לאפשר
          ניווט ללא עלויות נוספות. ניתן להמשיך להשתמש ברשימה ובמסלול האישיים.
        </p>
        {usageInfo && (
          <div className="rounded-full border border-white/10 bg-black/30 px-4 py-1 text-xs text-slate-200/80">
            שימוש: {usageInfo.usage.toLocaleString("he-IL")} מתוך{" "}
            {usageInfo.limit.toLocaleString("he-IL")} טעינות · נותרו{" "}
            {usageInfo.remaining.toLocaleString("he-IL")}
          </div>
        )}
      </div>
      <div className="relative z-10 flex flex-wrap items-center justify-center gap-3">
        <a
          href={fallbackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20"
        >
          פתיחה בתצוגה חדשה
        </a>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className={cn(
              "flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20",
              isRetrying && "opacity-70",
            )}
          >
            <RefreshCw className={cn("h-4 w-4", isRetrying && "animate-spin")} />
            נסו שוב
          </button>
        )}
      </div>
    </div>
  );
}
