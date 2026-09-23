"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

/** Classic Halloween bat — two ears, smooth wings, three scallops per side. */
function BatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 112 48" aria-hidden className={className}>
      <path
        fill="currentColor"
        d="M6 32
          C2 24 2 14 10 8
          C18 4 28 6 38 10
          C44 10 47 11 48 12
          L52 2
          L56 12
          L64 2
          L68 12
          C69 11 72 10 78 10
          C88 6 98 4 104 8
          C110 14 110 24 106 32
          L92 36 L84 28 L76 36 L68 28 L60 36
          L56 24
          L52 36 L44 28 L36 36 L26 28 L16 36
          L6 32
          Z"
      />
      <circle cx="54" cy="14" r="2.2" fill="#fff" opacity="0.95" />
      <circle cx="62" cy="14" r="2.2" fill="#fff" opacity="0.95" />
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
