"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

/** Flying bat emojis — horizontal drift only, no rotation. */
export function CountdownDecor() {
  const batDirs = useMemo(
    () =>
      [0, 1, 2].map(() => (Math.random() > 0.5 ? "ltr" : "rtl")) as ("ltr" | "rtl")[],
    [],
  );

  return (
    <div className="countdown-decor pointer-events-none absolute inset-0 z-[8] overflow-hidden" aria-hidden>
      {batDirs.map((dir, index) => (
        <span
          key={`bat-${index}-${dir}`}
          className={cn(
            "countdown-decor__bat-emoji",
            `countdown-decor__bat-emoji--${index + 1}`,
            dir === "ltr" ? "countdown-decor__bat-emoji--ltr" : "countdown-decor__bat-emoji--rtl",
          )}
        >
          🦇
        </span>
      ))}
    </div>
  );
}
