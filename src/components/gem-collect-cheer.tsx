"use client";

import { GemSprite } from "@/components/gem-hunt/gem-sprite";
import type { GemVariantId } from "@/lib/gem-variants";

export function GemCollectCheer({
  show,
  variantId,
}: {
  show: boolean;
  variantId: GemVariantId | string;
}) {
  if (!show) return null;
  return (
    <div className="gem-collect-cheer" role="status" aria-live="polite">
      <div className="gem-collect-cheer__card">
        <span className="gem-collect-cheer__burst" aria-hidden="true">
          <i /><i /><i /><i /><i /><i />
        </span>
        <GemSprite variantId={variantId} size="sm" className="gem-collect-cheer__gem" />
        <span className="gem-collect-cheer__text">אוצר נאסף!</span>
      </div>
    </div>
  );
}
