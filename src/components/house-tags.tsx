import { Badge } from "@/components/ui/badge";
import { markedGlutenFree, treatLevel } from "@/lib/house-state";
import type { TreatId, TreatStock } from "@/lib/types";

export function HouseTags({
  house,
}: {
  house: { accessible: boolean; treats: TreatId[]; treatStock?: TreatStock };
}) {
  const gluten = markedGlutenFree(house);
  const glutenOut = gluten && treatLevel(house, "glutenFree") === "out";
  if (!house.accessible && !gluten) return null;
  return (
    <div className="flex flex-wrap gap-1">
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
