"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

function BatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 48" aria-hidden className={className} fill="currentColor">
      <path d="M48 6c-10 0-18 6-20 15-4-2-9-4-14-2-5 10-2 22 6 28 4-8 11-13 20-13s16 5 20 13c8-6 11-18 6-28-5-2-10 0-14 2C66 12 58 6 48 6Z" />
    </svg>
  );
}

/** Flying bats (top layer) + one hero pumpkin. Moon lives in the text column. */
export function CountdownDecor() {
  const batDirs = useMemo(
    () =>
      [0, 1, 2].map(() => (Math.random() > 0.5 ? "ltr" : "rtl")) as ("ltr" | "rtl")[],
    [],
  );

  return (
    <div className="countdown-decor pointer-events-none absolute inset-0 z-[45] overflow-hidden" aria-hidden>
      {batDirs.map((dir, index) => (
        <BatIcon
          key={`bat-${index}-${dir}`}
          className={cn(
            "countdown-decor__bat-fly",
            `countdown-decor__bat-fly--${index + 1}`,
            dir === "ltr" ? "countdown-decor__bat-fly--ltr" : "countdown-decor__bat-fly--rtl",
          )}
        />
      ))}
      <span className="countdown-decor__pumpkin">🎃</span>
    </div>
  );
}
