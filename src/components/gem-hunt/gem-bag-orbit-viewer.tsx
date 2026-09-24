"use client";

import { GemModel3D } from "@/components/gem-hunt/gem-model-3d";
import { gemLabelHe, gemMonsterForHouse } from "@/lib/gem-hunt";
import { houseHeadline } from "@/lib/labels";
import type { PublicHouse } from "@/lib/types";

export function GemBagOrbitViewer({ house }: { house: PublicHouse | null }) {
  if (!house) {
    return (
      <div className="gem-bag-viewer gem-bag-viewer--empty">
        <p className="text-sm text-violet-300">בחרו בית מהרשימה כדי לסובב את האוצר</p>
      </div>
    );
  }

  const monsterId = gemMonsterForHouse(house);

  return (
    <div className="gem-bag-viewer">
      <p className="gem-bag-viewer__label">
        {gemLabelHe(monsterId)} · {houseHeadline(house)}
      </p>
      <p className="gem-bag-viewer__hint">גררו באצבע / עכבר — סיבוב, זום, מלמעלה</p>
      <div className="gem-bag-viewer__stage">
        <GemModel3D
          houseId={house.id}
          monsterId={monsterId}
          size="fill"
          controls="orbit"
          interactive
        />
      </div>
    </div>
  );
}
