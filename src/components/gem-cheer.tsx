"use client";

import { createPortal } from "react-dom";
import { ImpMenuActiveGlyph } from "@/components/imp-marker-glyph";
import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";

export function GemCheer({
  show,
}: {
  show: boolean;
  /** @deprecated — cheer is text-only (no WebGL in yellow toast). */
  house?: unknown;
  monsterId?: unknown;
}) {
  const { t } = useLocale();
  if (!show) return null;
  const cheer = (
    <div className="gem-cheer" role="status" aria-live="polite">
      <div className={cn("gem-cheer-card")}>
        <span className="gem-cheer-burst" aria-hidden="true">
          <i /><i /><i /><i /><i /><i />
        </span>
        <span className="gem-cheer-gem" aria-hidden="true">
          <ImpMenuActiveGlyph className="size-10" />
        </span>
        {t("help.product.gemFoundCheer")}
      </div>
    </div>
  );
  if (typeof document === "undefined") return cheer;
  return createPortal(cheer, document.body);
}
