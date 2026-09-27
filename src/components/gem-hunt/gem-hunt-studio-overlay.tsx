"use client";

import { GemOrbitStage } from "@/components/gem-hunt/gem-orbit-stage";
import { gemLabelHe } from "@/lib/gem-monsters";
import type { GemMonsterId } from "@/lib/gem-monsters";
import type { PublicHouse } from "@/lib/types";

/** iOS (and fallback): full-screen finger orbit — inspect the whole body. */
export function GemHuntStudioOverlay({
  house,
  monsterId,
  onClose,
}: {
  house: PublicHouse;
  monsterId: GemMonsterId;
  onClose: () => void;
}) {
  return (
    <div className="gem-hunt-studio" dir="rtl">
      <div className="gem-hunt-studio__bar">
        <div>
          <p className="gem-hunt-studio__kicker">סיבוב 360°</p>
          <p className="gem-hunt-studio__title">{gemLabelHe(monsterId)}</p>
        </div>
        <button type="button" className="gem-hunt-studio__close" onClick={onClose}>
          חזרה למצלמה
        </button>
      </div>
      <GemOrbitStage
        house={house}
        className="gem-hunt-studio__stage"
        stageClassName="gem-hunt-studio__canvas"
        hint="גררו באצבע · צביטה להתקרב — סובבו מסביב לראות את כל הגוף"
      />
    </div>
  );
}
