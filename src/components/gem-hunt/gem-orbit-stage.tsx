"use client";

import { GemModel3D } from "@/components/gem-hunt/gem-model-3d";
import { gemMonsterForHouse } from "@/lib/gem-monsters";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Same 3D orbit view as gem bag — finger / mouse rotate, pinch zoom. */
export function GemOrbitStage({
  house,
  className,
  stageClassName,
  hint,
}: {
  house: Pick<PublicHouse, "id" | "theme" | "kind">;
  className?: string;
  stageClassName?: string;
  hint?: string;
}) {
  const monsterId = gemMonsterForHouse(house);
  return (
    <div className={cn("gem-orbit-stage", className)}>
      {hint ? <p className="gem-orbit-stage__hint">{hint}</p> : null}
      <div className={cn("gem-orbit-stage__canvas", stageClassName)}>
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
