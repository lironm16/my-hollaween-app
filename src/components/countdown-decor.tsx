"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

/** Classic Halloween bat — scalloped wings, pointed ears, glowing eyes. */
function BatIcon({ className }: { className?: string }) {
  const half = `
    M 0 14
    L -4 3 -6 10 -8 3 -10 10 -12 3 -14 10 -16 3 -18 10 -20 3 -22 10 -24 3 -26 14
    C -30 12 -34 11 -38 11
    C -46 11 -50 17 -50 26
    C -46 24 -42 22 -38 21
    C -44 24 -48 30 -50 36
    C -42 32 -34 27 -26 23
    C -28 29 -29 35 -29 39
    L -24 39
    C -22 33 -18 27 -14 23
    C -16 29 -17 35 -17 39
    L -14 39 L -13 32 L -12 39 L -11 32 L -10 39
    L -9 32 L -8 39 L -7 32 L -6 39 L -5 32 L -4 39 L -3 32 L -2 39 L -1 32 L 0 39
    Z
  `;

  return (
    <svg viewBox="0 0 112 48" aria-hidden className={className}>
      <g transform="translate(56 4)">
        <path fill="currentColor" d={half} />
        <path fill="currentColor" d={half} transform="scale(-1 1)" />
      </g>
      <circle cx="50" cy="16" r="2.4" fill="#fff" opacity="0.95" />
      <circle cx="62" cy="16" r="2.4" fill="#fff" opacity="0.95" />
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
