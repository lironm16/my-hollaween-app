"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

function BatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 44" aria-hidden className={className} fill="currentColor">
      <path d="M50 14c-1.8 0-3.4.8-4.5 2.1l-1.8-3.4c-.4-.8-1.5-.8-1.9 0l-1.8 3.4c-1.1-1.3-2.7-2.1-4.5-2.1-3.1 0-5.6 2.5-5.6 5.6 0 1.3.4 2.5 1.2 3.5-5 1-9.5 3.4-12.8 7.1-.9 1-.1 2.6 1.2 2.4 3.6-.6 6.8-2.1 9.5-4.3-.6 2.1-1 4.3-1 6.6 0 .7.6 1.2 1.2 1.2h3.3c.7 0 1.2-.6 1.2-1.2 0-2.4.9-4.6 2.4-6.3 1.5 1.7 2.4 3.9 2.4 6.3 0 .7.6 1.2 1.2 1.2h3.3c.7 0 1.2-.6 1.2-1.2 0-2.3-.4-4.5-1-6.6 2.7 2.2 5.9 3.7 9.5 4.3 1.3.2 2.1-1.4 1.2-2.4-3.3-3.7-7.8-6.1-12.8-7.1.8-1 1.2-2.2 1.2-3.5 0-3.1-2.5-5.6-5.6-5.6Z" />
      <path d="M28 22C14 19 4 23 0 32c2.5-3.5 6.5-6 11-7C6 22 3 14 1 6c9 3.5 16.5 9 27 16Z" />
      <path d="M72 22C86 19 96 23 100 32c-2.5-3.5-6.5-6-11-7c5-3 8-11 10-19-9 3.5-16.5 9-27 16Z" />
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
        <div
          key={`bat-${index}-${dir}`}
          className={cn(
            "countdown-decor__bat-fly",
            `countdown-decor__bat-fly--${index + 1}`,
            dir === "ltr" ? "countdown-decor__bat-fly--ltr" : "countdown-decor__bat-fly--rtl",
          )}
        >
          <div className={cn("countdown-decor__bat-inner", dir === "rtl" && "countdown-decor__bat-inner--flip")}>
            <BatIcon className="countdown-decor__bat-svg" />
          </div>
        </div>
      ))}
      <span className="countdown-decor__pumpkin">🎃</span>
    </div>
  );
}
