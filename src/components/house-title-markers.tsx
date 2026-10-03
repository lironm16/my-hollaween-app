"use client";

import { Heart } from "lucide-react";
import { GemDiamondSvg } from "@/components/gem-diamond-icon";

/** Heart / diamond before house name — list, map sheet, route tail, cluster rows. */
export function HouseTitleMarkers({
  liked,
  gemCollected,
}: {
  liked?: boolean;
  gemCollected?: boolean;
}) {
  if (!liked && !gemCollected) return null;
  return (
    <>
      {liked ? (
        <Heart
          className="me-1.5 inline size-6 fill-current text-[#fb7185] align-middle"
          strokeWidth={2.2}
          aria-label="אהבתי"
        />
      ) : null}
      {gemCollected ? (
        <>
          <GemDiamondSvg className="me-1.5 inline size-7 align-middle" aria-hidden />
          <span className="sr-only">שדון</span>
        </>
      ) : null}
    </>
  );
}
