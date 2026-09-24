"use client";

import { createPortal } from "react-dom";
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
  const cheer = (
    <div className="gem-collect-cheer" role="status" aria-live="polite">
      <div className="gem-collect-cheer__card">
        <span className="gem-collect-cheer__burst" aria-hidden="true">
          <i /><i /><i /><i /><i /><i />
        </span>
        <GemSprite
          house={house}
          mode="poster"
          posterFill
          className="gem-collect-cheer__gem"
        />
        <span className="gem-collect-cheer__text">יהלום נאסף!</span>
      </div>
    </div>
  );
  if (typeof document === "undefined") return cheer;
  return createPortal(cheer, document.body);
}
