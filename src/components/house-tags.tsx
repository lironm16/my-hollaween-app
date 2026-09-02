import { Badge } from "@/components/ui/badge";
import { candyLevel, markedGlutenFree, offersNutsFree, offersSesameFree, treatLevel } from "@/lib/house-state";
import { scareShort, stockLabels, treatLabels } from "@/lib/labels";
import type { ScareLevel, TreatId, TreatStock } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HouseTags({
  house,
}: {
  house: {
    accessible: boolean;
    treats: TreatId[];
    treatStock?: TreatStock;
    scareLevel?: ScareLevel;
  };
}) {
  const gluten = markedGlutenFree(house);
  const glutenOut = gluten && treatLevel(house, "glutenFree") === "out";
  const candy = candyLevel(house);
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
      {house.scareLevel ? (
        <Badge
          className={cn(
            house.scareLevel === "spicy"
              ? "bg-red-800 text-red-50"
              : house.scareLevel === "medium"
                ? "bg-violet-800 text-violet-50"
                : "bg-sky-800 text-sky-50",
          )}
        >
          {scareShort[house.scareLevel]}
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
      {offersNutsFree(house) ? (
        <Badge className="bg-amber-800 text-amber-50">{treatLabels.nutsFree}</Badge>
      ) : null}
      {offersSesameFree(house) ? (
        <Badge className="bg-amber-800 text-amber-50">{treatLabels.sesameFree}</Badge>
      ) : null}
    </div>
  );
}
