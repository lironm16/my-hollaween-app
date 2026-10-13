"use client";

import { createPortal } from "react-dom";
import { ImpMenuActiveGlyph } from "@/components/imp-marker-glyph";
import { GEM_FOUND_CHEER_HE } from "@/lib/gem-hunt-copy";
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
        <ImpMenuActiveGlyph className="gem-collect-cheer__gem-icon" />
        <span className="gem-collect-cheer__text">{GEM_FOUND_CHEER_HE}</span>
      </div>
    </div>
  );
  if (typeof document === "undefined") return cheer;
  return createPortal(cheer, document.body);
}
