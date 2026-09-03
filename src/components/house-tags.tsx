import { StrollerSign } from "@/components/symbols";
import { CandySign, candyTone } from "@/components/candy-glyphs";
import { DecorSign } from "@/components/decor-glyphs";
import { ScareSign } from "@/components/scare-glyphs";
import { SensitivitySign } from "@/components/sensitivity-glyphs";
import {
  markedGlutenFree,
  offersNutsFree,
  offersSesameFree,
  resolveDecorLevel,
  treatLevel,
} from "@/lib/house-state";
import type { DecorLevel, ScareLevel, TreatId, TreatStock } from "@/lib/types";

export function HouseTags({
  house,
}: {
  house: {
    address?: string;
    lat?: number;
    lng?: number;
    accessible?: boolean;
    treats?: TreatId[];
    treatStock?: TreatStock;
    scareLevel?: ScareLevel;
    visit?: "come" | "decorOnly" | "closed";
    decorLevel?: DecorLevel;
    decorated?: boolean;
    soldOut?: boolean;
    openFrom?: string;
    openTo?: string;
    openFrom2?: string;
    openTo2?: string;
    openHours?: { from: string; to: string }[];
  };
}) {
  const treats = house.treats ?? [];
  const withTreats = { treats, treatStock: house.treatStock };
  const scare = house.scareLevel ?? "mild";
  const candy = candyTone(withTreats);
  const gluten = markedGlutenFree(withTreats);
  const glutenOut = gluten && treatLevel(withTreats, "glutenFree") === "out";
  const undecorated = resolveDecorLevel(house) === "none";

  return (
    <div className="flex flex-wrap gap-1">
      <CandySign tone={candy} />
      {undecorated ? <DecorSign level="none" /> : <ScareSign level={scare} />}
      {house.accessible ? (
        <span title="נגיש" aria-label="נגיש">
          <StrollerSign />
        </span>
      ) : null}
      {gluten ? <SensitivitySign kind="glutenFree" out={glutenOut} /> : null}
      {offersNutsFree(withTreats) ? <SensitivitySign kind="nutsFree" /> : null}
      {offersSesameFree(withTreats) ? <SensitivitySign kind="sesameFree" /> : null}
    </div>
  );
}
