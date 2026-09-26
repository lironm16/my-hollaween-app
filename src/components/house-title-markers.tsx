"use client";

import { Gem, Heart } from "lucide-react";

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
          className="mb-0.5 me-1.5 inline size-5 fill-current text-[#fb7185]"
          strokeWidth={2.2}
          aria-label="אהבתי"
        />
      ) : null}
      {gemCollected ? (
        <Gem
          className="mb-0.5 me-1.5 inline size-5 fill-current text-orange-300"
          strokeWidth={2.1}
          aria-label="יהלום"
        />
      ) : null}
    </>
  );
}
