"use client";

import { GemSprite } from "@/components/gem-hunt/gem-sprite";
import type { GemType } from "@/lib/gem-hunt";

export function GemCollectCheer({ show, type }: { show: boolean; type: GemType }) {
  if (!show) return null;
  return (
    <div className="gem-collect-cheer" role="status" aria-live="polite">
      <div className="gem-collect-cheer__card">
        <span className="gem-collect-cheer__burst" aria-hidden="true">
          <i /><i /><i /><i /><i /><i />
        </span>
        <GemSprite type={type} size="sm" className="gem-collect-cheer__gem" />
        <span className="gem-collect-cheer__text">אוצר נאסף!</span>
      </div>
    </div>
  );
}
