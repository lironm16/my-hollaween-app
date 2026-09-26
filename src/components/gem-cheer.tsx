"use client";

import { createPortal } from "react-dom";
import { Gem } from "lucide-react";
import { GemModel3D } from "@/components/gem-hunt/gem-model-3d";
import type { GemMonsterId } from "@/lib/gem-monsters";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function GemCheer({
  show,
  house,
  monsterId,
}: {
  show: boolean;
  house?: Pick<PublicHouse, "id" | "theme" | "kind">;
  monsterId?: GemMonsterId;
}) {
  if (!show) return null;
  const usePet3d = Boolean(house && monsterId);
  const cheer = (
    <div className="gem-cheer" role="status" aria-live="polite">
      <div className={cn("gem-cheer-card", usePet3d && "gem-cheer-card--3d")}>
        <span className="gem-cheer-burst" aria-hidden="true">
          <i /><i /><i /><i /><i /><i />
        </span>
        <span className="gem-cheer-gem" aria-hidden="true">
          {usePet3d ? (
            <span className="gem-cheer-model">
              <GemModel3D
                houseId={house!.id}
                monsterId={monsterId!}
                size="sm"
                collected
                motion="celebrate"
                spin
                interactive={false}
                celebrateVariant={3}
                spinRate={0.85}
              />
            </span>
          ) : (
            <Gem className="size-5 fill-current" strokeWidth={2.1} />
          )}
        </span>
        יהלום נאסף!
      </div>
    </div>
  );
  if (typeof document === "undefined") return cheer;
  return createPortal(cheer, document.body);
}
