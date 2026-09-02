import { Badge } from "@/components/ui/badge";
import { candyLevel, markedGlutenFree, treatLevel } from "@/lib/house-state";
import { stockLabels } from "@/lib/labels";
import type { TreatId, TreatStock } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HouseTags({
  house,
}: {
  house: { accessible: boolean; treats: TreatId[]; treatStock?: TreatStock };
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
          ללא גלוטן
        </Badge>
      ) : null}
    </div>
  );
}
