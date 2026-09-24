"use client";

import { GemOrbitStage } from "@/components/gem-hunt/gem-orbit-stage";
import { gemLabelHe, gemMonsterForHouse } from "@/lib/gem-hunt";
import { houseHeadline } from "@/lib/labels";
import type { PublicHouse } from "@/lib/types";

export function GemBagOrbitViewer({ house }: { house: PublicHouse | null }) {
  if (!house) {
    return (
      <div className="gem-bag-viewer gem-bag-viewer--empty">
        <p className="text-sm text-violet-300">בחרו בית מהרשימה כדי לסובב את היהלום</p>
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
