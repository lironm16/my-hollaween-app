import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { scareLabels, treatLabels } from "@/lib/labels";
import type { PublicHouse } from "@/lib/types";
import Link from "next/link";

export function HouseDetails({
  house,
  extra,
}: {
  house: PublicHouse;
  extra?: React.ReactNode;
}) {
  const maps = `https://www.google.com/maps?q=${house.lat},${house.lng}`;
  const waze = `https://waze.com/ul?ll=${house.lat},${house.lng}&navigate=yes`;
  return (
    <div className="space-y-3">
      <div>
        <p className="font-display text-xl text-orange-300">
          {house.soldOut ? "🕸️" : "🎃"} {house.name}
        </p>
        <p className="text-sm text-violet-200">{house.address}</p>
        <p className="mt-1 font-mono text-xs text-orange-200/70">{house.id}</p>
      </div>
      {house.soldOut ? (
        <p className="rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-200">
          נגמרו הממתקים בבית הזה לפי שעה.
        </p>
      ) : null}
      {house.description ? (
        <p className="text-sm leading-relaxed text-violet-50">{house.description}</p>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        <Badge>{scareLabels[house.scareLevel]}</Badge>
        <Badge variant="secondary">
          {house.openFrom}–{house.openTo}
        </Badge>
        {house.treats.map((t) => (
          <Badge key={t} variant="outline">
            {treatLabels[t]}
          </Badge>
        ))}
      </div>
      {house.notes ? (
        <p className="text-sm text-amber-200/90">הערה: {house.notes}</p>
      ) : null}
      <div className="flex flex-wrap gap-2 pt-1">
        <a href={waze} target="_blank" rel="noreferrer">
          <Button size="sm">ניווט ב־Waze</Button>
        </a>
        <a href={maps} target="_blank" rel="noreferrer">
          <Button size="sm" variant="outline">
            Google Maps
          </Button>
        </a>
        <Link href={`/house/${encodeURIComponent(house.id)}`}>
          <Button size="sm" variant="ghost">
            קישור לבית
          </Button>
        </Link>
      </div>
      {extra}
    </div>
  );
}
