"use client";

import { GemOrbitStage } from "@/components/gem-hunt/gem-orbit-stage";
import { useGemCopy } from "@/hooks/use-gem-copy";
import { useLocale } from "@/hooks/use-locale";
import { gemMonsterForHouse } from "@/lib/gem-monsters";
import { houseHeadline } from "@/lib/labels";
import type { PublicHouse } from "@/lib/types";

export function GemBagOrbitViewer({ house }: { house: PublicHouse | null }) {
  const { t } = useLocale();
  const gemCopy = useGemCopy();
  if (!house) {
    return (
      <div className="gem-bag-viewer gem-bag-viewer--empty">
        <p className="text-sm text-violet-300">{t("gem.orbitPickHouse")}</p>
      </div>
    );
  }

  const monsterId = gemMonsterForHouse(house);

  return (
    <div className="gem-bag-viewer">
      <p className="gem-bag-viewer__label">
        {gemCopy.petLabel(monsterId)} · {houseHeadline(house)}
      </p>
      <GemOrbitStage
        house={house}
        hint={t("gem.orbitHintBag")}
        stageClassName="gem-bag-viewer__stage"
      />
    </div>
  );
}
