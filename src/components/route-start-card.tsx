"use client";

import { MapPin, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RouteStartCard({
  label,
  started,
  stopCount,
  onStart,
  onChangeOrigin,
}: {
  label: string;
  started: boolean;
  stopCount: number;
  onStart: () => void;
  onChangeOrigin?: () => void;
}) {
  return (
    <div
      className={cn(
        "route-start-card",
        started && "is-started",
      )}
      dir="rtl"
    >
      <div className="route-start-card-icon" aria-hidden="true">
        <MapPin className="size-4" strokeWidth={2.4} />
      </div>
      <div className="route-start-card-body">
        <p className="route-start-card-title">נקודת התחלה</p>
        <p className="route-start-card-label">{label}</p>
        {!started ? (
          <p className="route-start-card-hint">
            {stopCount > 0
              ? `${stopCount} עצירות במסלול — לחצו התחלה כדי לצאת לדרך`
              : "אין עצירות במסלול"}
          </p>
        ) : (
          <p className="route-start-card-hint is-active">המסלול פעיל — יוצאים מנקודת ההתחלה</p>
        )}
      </div>
      <div className="route-start-card-actions">
        {onChangeOrigin ? (
          <Button type="button" size="sm" variant="outline" onClick={onChangeOrigin}>
            שינוי
          </Button>
        ) : null}
        {!started && stopCount > 0 ? (
          <Button
            type="button"
            size="lg"
            className="route-start-card-btn bg-emerald-500 text-base font-bold text-black hover:bg-emerald-400"
            onClick={onStart}
          >
            <Play className="size-4" />
            התחלה
          </Button>
        ) : null}
      </div>
    </div>
  );
}
