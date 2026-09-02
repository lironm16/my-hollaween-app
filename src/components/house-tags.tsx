import { Badge } from "@/components/ui/badge";
import {
  candyLevel,
  markedGlutenFree,
  offersNutsFree,
  offersSesameFree,
  treatLevel,
} from "@/lib/house-state";
import { scareShort, stockLabels, treatLabels } from "@/lib/labels";
import type { ScareLevel, TreatId, TreatStock } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HouseTags({
  house,
  compact = false,
}: {
  house: {
    address?: string;
    lat?: number;
    lng?: number;
    accessible?: boolean;
    treats?: TreatId[];
    treatStock?: TreatStock;
    scareLevel?: ScareLevel;
    openFrom?: string;
    openTo?: string;
  };
  /** Smaller set for map popups. */
  compact?: boolean;
}) {
  const treats = house.treats ?? [];
  const withTreats = { treats, treatStock: house.treatStock };
  const scare = house.scareLevel ?? "mild";
  const candy = candyLevel(withTreats);
  const gluten = markedGlutenFree(withTreats);
  const glutenOut = gluten && treatLevel(withTreats, "glutenFree") === "out";

  return (
    <div className="flex flex-wrap gap-1">
      <Badge
        className={cn(
          candy === "out"
            ? "bg-red-700 text-white"
            : candy === "low"
              ? "bg-amber-400 text-black"
              : "bg-emerald-700 text-white",
        )}
      >
        ממתקים · {stockLabels[candy]}
      </Badge>
      <Badge
        className={cn(
          scare === "spicy"
            ? "bg-red-800 text-red-50"
            : scare === "medium"
              ? "bg-violet-800 text-violet-50"
              : "bg-sky-800 text-sky-50",
        )}
      >
        {scareShort[scare]}
      </Badge>
      {!compact && house.openFrom && house.openTo ? (
        <Badge variant="secondary" className="bg-black/30 text-violet-100">
          {house.openFrom}–{house.openTo}
        </Badge>
      ) : null}
      {house.accessible ? (
        <Badge className="bg-emerald-700 text-emerald-50">נגיש</Badge>
      ) : null}
      {gluten ? (
        <Badge
          className={
            glutenOut
              ? "border-red-400/40 bg-transparent text-red-200 line-through"
              : "bg-amber-800 text-amber-50"
          }
          variant={glutenOut ? "outline" : "default"}
        >
          {treatLabels.glutenFree}
        </Badge>
      ) : null}
      {offersNutsFree(withTreats) ? (
        <Badge className="bg-amber-800 text-amber-50">{treatLabels.nutsFree}</Badge>
      ) : null}
      {offersSesameFree(withTreats) ? (
        <Badge className="bg-amber-800 text-amber-50">{treatLabels.sesameFree}</Badge>
      ) : null}
    </div>
  );
}
