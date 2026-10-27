"use client";

import type { MouseEvent } from "react";
import { useLocale } from "@/hooks/use-locale";
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
  const { t } = useLocale();
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
      {centerReveal ? t("gem.hide") : t("gem.tellMe")}
    </button>
  );
}
