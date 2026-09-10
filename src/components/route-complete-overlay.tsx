"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RouteCompleteOverlay({
  show,
  stopCount,
  onDismiss,
}: {
  show: boolean;
  stopCount: number;
  onDismiss: () => void;
}) {
  if (!show) return null;

  return (
    <div className="route-complete-overlay" role="dialog" aria-modal="true" aria-labelledby="route-complete-title">
      <div className="route-complete-backdrop" aria-hidden="true">
        <span className="route-complete-orb route-complete-orb--1" />
        <span className="route-complete-orb route-complete-orb--2" />
        <span className="route-complete-orb route-complete-orb--3" />
        <span className="route-complete-confetti" aria-hidden="true">
          {Array.from({ length: 24 }, (_, i) => (
            <i key={i} style={{ "--i": i } as React.CSSProperties} />
          ))}
        </span>
      </div>
      <div className="route-complete-card">
        <div className="route-complete-icon" aria-hidden="true">
          <Sparkles className="size-10" />
        </div>
        <h2 id="route-complete-title" className="route-complete-title">
          סיימתם את המסלול!
        </h2>
        <p className="route-complete-text">
          {stopCount > 0
            ? `ביקרתם בכל ${stopCount} העצירות. ליל כיף מדהים — תודה שיצאתם לדרך בשכונה!`
            : "המסלול הושלם. ליל כיף מדהים!"}
        </p>
        <Button
          type="button"
          size="lg"
          className="route-complete-btn bg-orange-500 text-black hover:bg-orange-400"
          onClick={onDismiss}
        >
          יאללה, עוד בתים!
        </Button>
      </div>
    </div>
  );
}
