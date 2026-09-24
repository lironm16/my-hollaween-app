"use client";

import { Gem } from "lucide-react";
import { cn } from "@/lib/utils";

export function MapGemHuntFab({
  onClick,
  nearGem,
  disabled,
}: {
  onClick: () => void;
  nearGem: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "map-gem-hunt-fab inline-flex size-14 items-center justify-center rounded-full bg-violet-700 text-amber-200 shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-1 ring-violet-400/50 hover:bg-violet-600 disabled:opacity-45",
        nearGem && "is-near",
      )}
      aria-label="חיפוש אוצר נסתר"
      title={nearGem ? "אוצר קרוב — פתחו מצלמה" : "חיפוש אוצר נסתר"}
    >
      <Gem className="size-8" strokeWidth={2.1} aria-hidden />
    </button>
  );
}
