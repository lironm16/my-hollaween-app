import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { scareShort, treatLabels, houseHeadline, visitShort, stockLabels } from "@/lib/labels";
import { effectiveVisit, isFrozen, treatLevel } from "@/lib/house-state";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HouseCard({
  house,
  onOpen,
  distanceM,
}: {
  house: PublicHouse;
  onOpen?: () => void;
  distanceM?: number;
}) {
  return (
    <Card
      size="sm"
      className={cn(
        "cursor-pointer border-orange-500/15 bg-[#1d1028]/90 transition hover:border-orange-400/50 hover:bg-[#261536]",
        house.soldOut && "opacity-70",
        effectiveVisit(house) === "closed" && "opacity-70",
        isFrozen(house) && "opacity-50",
      )}
      onClick={onOpen}
    >
      <CardHeader className="pb-1">
        <CardTitle className="flex items-start justify-between gap-2 text-orange-100">
          <span>{houseHeadline(house)}</span>
          <Badge variant={house.scareLevel === "spicy" ? "destructive" : "secondary"}>
            {scareShort[house.scareLevel]}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-violet-100/80">
        <p>{house.address}</p>
        {house.arrival ? <p className="text-xs text-amber-200/90">{house.arrival}</p> : null}
        <p className="text-xs">
          {house.openFrom}–{house.openTo}
          {distanceM !== undefined ? ` · ${formatDistance(distanceM)}` : ""}
          {effectiveVisit(house) === "closed" ? " · נגמר — אל תבואו" : ""}
          {effectiveVisit(house) === "decorOnly" ? " · מקושט בלי ממתקים" : ""}
          {isFrozen(house) ? " · מוקפא" : ""}
        </p>
        <div className="flex flex-wrap gap-1">
          {house.accessible ? (
            <Badge className="bg-emerald-700 text-emerald-50">נגיש</Badge>
          ) : null}
          {house.status === "pending" ? (
            <Badge variant="secondary">ממתין לאישור</Badge>
          ) : null}
          <Badge variant="outline">{visitShort[effectiveVisit(house)]}</Badge>
          {house.treats.map((t) => {
            const level = treatLevel(house, t);
            return (
              <Badge
                key={t}
                variant="outline"
                className={
                  level === "out"
                    ? "border-red-400/40 text-red-200"
                    : "border-orange-400/30 text-orange-100"
                }
              >
                {treatLabels[t]}
                {level !== "plenty" ? ` · ${stockLabels[level]}` : ""}
              </Badge>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function formatDistance(m: number) {
  if (m < 1000) return `${Math.round(m)} מ׳`;
  return `${(m / 1000).toFixed(1)} ק״מ`;
}
