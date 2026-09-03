import { Badge } from "@/components/ui/badge";
import { StrollerSign } from "@/components/symbols";
import { CandySign, candyTone } from "@/components/candy-glyphs";
import { DecorSign } from "@/components/decor-glyphs";
import {
  isDecorated,
  markedGlutenFree,
  offersNutsFree,
  offersSesameFree,
  treatLevel,
} from "@/lib/house-state";
import { scareShort, treatLabels } from "@/lib/labels";
import { formatHoursLabel } from "@/lib/hours";
import type { ScareLevel, TreatId, TreatStock } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HouseTags({
  house,
  compact = false,
  showHours = true,
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
    decorated?: boolean;
    soldOut?: boolean;
    openFrom?: string;
    openTo?: string;
    openFrom2?: string;
    openTo2?: string;
    openHours?: { from: string; to: string }[];
  };
  /** Smaller set for map popups. */
  compact?: boolean;
  /** Hours already shown on list cards — hide the badge there. */
  showHours?: boolean;
}) {
  const treats = house.treats ?? [];
  const withTreats = { treats, treatStock: house.treatStock };
  const scare = house.scareLevel ?? "mild";
  const candy = candyTone(withTreats);
  const gluten = markedGlutenFree(withTreats);
  const glutenOut = gluten && treatLevel(withTreats, "glutenFree") === "out";
  const hoursLabel = formatHoursLabel(house);

  return (
    <div className="flex flex-wrap gap-1">
      <CandySign tone={candy} />
      <Badge
        className={cn(
          "h-6 text-sm",
          scare === "spicy"
            ? "bg-[#b91c1c] text-[#fff7ed]"
            : scare === "medium"
              ? "bg-[#d97706] text-[#1c0e24]"
              : "bg-[#047857] text-[#fff7ed]",
        )}
      >
        {scareShort[scare]}
      </Badge>
      {showHours && !compact && hoursLabel ? (
        <Badge variant="secondary" className="h-6 bg-black/30 text-sm text-violet-100">
          {hoursLabel}
        </Badge>
      ) : null}
      <DecorSign on={isDecorated(house)} />
      {house.accessible ? (
        <span title="נגיש" aria-label="נגיש">
          <StrollerSign />
        </span>
      ) : null}
      {gluten ? (
        <Badge
          className={cn(
            "h-6 text-sm",
            glutenOut
              ? "border-red-400/40 bg-transparent text-red-200 line-through"
              : "bg-amber-800 text-amber-50",
          )}
          variant={glutenOut ? "outline" : "default"}
        >
          {treatLabels.glutenFree}
        </Badge>
      ) : null}
      {offersNutsFree(withTreats) ? (
        <Badge className="h-6 bg-amber-800 text-sm text-amber-50">{treatLabels.nutsFree}</Badge>
      ) : null}
      {offersSesameFree(withTreats) ? (
        <Badge className="h-6 bg-amber-800 text-sm text-amber-50">{treatLabels.sesameFree}</Badge>
      ) : null}
    </div>
  );
}
