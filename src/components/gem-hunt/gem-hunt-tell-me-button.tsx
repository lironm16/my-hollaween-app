"use client";

import type { MouseEvent } from "react";
import { cn } from "@/lib/utils";

export function GemHuntTellMeButton({
  centerReveal,
  readyHighlight,
  onClick,
}: {
  centerReveal: boolean;
  readyHighlight: boolean;
  onClick: (e: MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "gem-hunt-overlay__hint-btn gem-hunt-overlay__hint-btn--reveal gem-hunt-overlay__hint-btn--compact",
        centerReveal && "is-active",
        readyHighlight && "is-ready",
      )}
      aria-pressed={centerReveal}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClick}
    >
      {centerReveal ? "הסתר" : "גלה לי"}
    </button>
  );
}
