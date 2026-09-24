"use client";

import { GemSprite } from "@/components/gem-hunt/gem-sprite";
import type { PublicHouse } from "@/lib/types";

export function GemCollectCheer({
  show,
  house,
}: {
  show: boolean;
  house: Pick<PublicHouse, "id" | "theme" | "kind">;
}) {
  if (!show) return null;
  return (
    <div className="gem-collect-cheer" role="status" aria-live="polite">
      <div className="gem-collect-cheer__card">
        <span className="gem-collect-cheer__burst" aria-hidden="true">
          <i /><i /><i /><i /><i /><i />
        </span>
        <GemSprite house={house} mode="poster" size="sm" className="gem-collect-cheer__gem" />
        <span className="gem-collect-cheer__text">אוצר נאסף!</span>
      </div>
    </div>
  );
}
