"use client";

import { createPortal } from "react-dom";
import { ImpMenuActiveGlyph } from "@/components/imp-marker-glyph";
import { useLocale } from "@/hooks/use-locale";
import type { PublicHouse } from "@/lib/types";

export function GemCollectCheer({
  show,
  house,
}: {
  show: boolean;
  house: Pick<PublicHouse, "id" | "theme" | "kind">;
}) {
  const { t } = useLocale();
  if (!show) return null;
  const cheer = (
    <div className="gem-collect-cheer" role="status" aria-live="polite">
      <div className="gem-collect-cheer__card">
        <span className="gem-collect-cheer__burst" aria-hidden="true">
          <i /><i /><i /><i /><i /><i />
        </span>
        <ImpMenuActiveGlyph className="gem-collect-cheer__gem-icon" />
        <span className="gem-collect-cheer__text">{t("help.product.gemFoundCheer")}</span>
      </div>
    </div>
  );
  if (typeof document === "undefined") return cheer;
  return createPortal(cheer, document.body);
}
