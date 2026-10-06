"use client";

import { GemOrbitStage } from "@/components/gem-hunt/gem-orbit-stage";
import { gemLabelHe, gemMonsterForHouse } from "@/lib/gem-hunt";
import { GEM_ORBIT_PICK_HOUSE_HE } from "@/lib/gem-hunt-copy";
import { houseHeadline } from "@/lib/labels";
import type { PublicHouse } from "@/lib/types";

export function GemBagOrbitViewer({ house }: { house: PublicHouse | null }) {
  if (!house) {
    return (
      <div className="gem-bag-viewer gem-bag-viewer--empty">
        <p className="text-sm text-violet-300">{GEM_ORBIT_PICK_HOUSE_HE}</p>
      </div>
    );
  }

  const monsterId = gemMonsterForHouse(house);

  return (
    <div className="gem-bag-viewer">
      <p className="gem-bag-viewer__label">
        {gemLabelHe(monsterId)} · {houseHeadline(house)}
      </p>
      <GemOrbitStage
        house={house}
        hint="גררו באצבע / עכבר — סיבוב, זום, מלמעלה"
        stageClassName="gem-bag-viewer__stage"
      />
    </div>
  );
}
