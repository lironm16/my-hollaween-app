"use client";

import { createPortal } from "react-dom";
import { GemDiamondIcon } from "@/components/gem-diamond-icon";
import { cn } from "@/lib/utils";

export function GemCheer({
  show,
}: {
  show: boolean;
  /** @deprecated — cheer is text-only (no WebGL in yellow toast). */
  house?: unknown;
  monsterId?: unknown;
}) {
  if (!show) return null;
  const cheer = (
    <div className="gem-cheer" role="status" aria-live="polite">
      <div className={cn("gem-cheer-card")}>
        <span className="gem-cheer-burst" aria-hidden="true">
          <i /><i /><i /><i /><i /><i />
        </span>
        <span className="gem-cheer-gem" aria-hidden="true">
          <GemDiamondIcon className="size-5" filled />
        </span>
        יהלום נאסף!
      </div>
    </div>
  );
  if (typeof document === "undefined") return cheer;
  return createPortal(cheer, document.body);
}
