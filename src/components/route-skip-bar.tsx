"use client";

import { SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RouteSkipBar({
  onSkip,
  disabled = false,
  compact = false,
}: {
  onSkip: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "route-skip-bar is-compact" : "route-skip-bar"}>
      <p className="route-skip-bar-text">לא עוצרים כאן? ממשיכים בלי לסמן ביקור.</p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="route-skip-bar-btn"
        disabled={disabled}
        onClick={onSkip}
      >
        <SkipForward className="size-3.5" />
        דלג
      </Button>
    </div>
  );
}
