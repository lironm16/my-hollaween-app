"use client";

import { createPortal } from "react-dom";
import { Gem } from "lucide-react";
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
          <Gem className="size-5 fill-current" strokeWidth={2.1} />
        </span>
        יהלום נאסף!
      </div>
    </div>
  );
  if (typeof document === "undefined") return cheer;
  return createPortal(cheer, document.body);
}
