import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { scareShort, treatLabels, themeEmoji, themeLabels } from "@/lib/labels";
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
      )}
      onClick={onOpen}
    >
      <CardHeader className="pb-1">
        <CardTitle className="flex items-start justify-between gap-2 text-orange-100">
          <span>
            {house.soldOut ? "🕸️ " : `${themeEmoji[house.theme ?? "pumpkin"]} `}
            {house.name}
          </span>
          <Badge variant={house.scareLevel === "spicy" ? "destructive" : "secondary"}>
            {scareShort[house.scareLevel]}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-violet-100/80">
        <p className="text-xs text-orange-200/80">{themeLabels[house.theme ?? "pumpkin"]}</p>
        <p>{house.address}</p>
        {house.arrival ? <p className="text-xs text-amber-200/90">{house.arrival}</p> : null}
        <p className="text-xs">
          {house.openFrom}–{house.openTo}
          {distanceM !== undefined ? ` · ${formatDistance(distanceM)}` : ""}
          {house.soldOut ? " · נגמרו הממתקים" : ""}
        </p>
        <div className="flex flex-wrap gap-1">
          {house.accessible ? (
            <Badge className="bg-emerald-700 text-emerald-50">נגיש</Badge>
          ) : null}
          {house.status === "pending" ? (
            <Badge variant="secondary">ממתין לאישור</Badge>
          ) : null}
          {house.treats.map((t) => (
            <Badge key={t} variant="outline" className="border-orange-400/30 text-orange-100">
              {treatLabels[t]}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function formatDistance(m: number) {
  if (m < 1000) return `${Math.round(m)} מ׳`;
  return `${(m / 1000).toFixed(1)} ק״מ`;
}
