"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CodesCopy } from "@/components/codes-copy";
import { scareLabels, treatLabels, houseHeadline, visitLabels, stockLabels } from "@/lib/labels";
import { effectiveVisit, freezeLabel, isFrozen, treatLevel } from "@/lib/house-state";
import { loadOwnedHouses } from "@/lib/offline-db";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HouseDetails({
  house,
  extra,
}: {
  house: PublicHouse;
  extra?: ReactNode;
}) {
  const maps = `https://www.google.com/maps?q=${house.lat},${house.lng}`;
  const waze = `https://waze.com/ul?ll=${house.lat},${house.lng}&navigate=yes`;
  const [editCode, setEditCode] = useState<string | undefined>(undefined);

  useEffect(() => {
    const owned = loadOwnedHouses().find((item) => item.id === house.id);
    setEditCode(owned?.editCode);
  }, [house.id]);
  return (
    <div className="space-y-3">
      <div>
        <p className="font-display text-xl text-orange-300">{houseHeadline(house)}</p>
        <p className="text-sm text-violet-200">{house.address}</p>
      </div>
      {house.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={house.photoUrl}
          alt=""
          className="h-40 w-full rounded-xl object-cover ring-1 ring-orange-500/25"
        />
      ) : null}
      {isFrozen(house) ? (
        <p className="rounded-lg bg-violet-950/70 px-3 py-2 text-sm text-violet-100">
          {freezeLabel(house)} — לא מוצג לילדים במפה הציבורית.
        </p>
      ) : null}
      {effectiveVisit(house) === "closed" ? (
        <p className="rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-200">
          נגמר מה לחלק. אין סיבה לבוא עכשיו.
        </p>
      ) : effectiveVisit(house) === "decorOnly" ? (
        <p className="rounded-lg bg-amber-950/50 px-3 py-2 text-sm text-amber-100">
          הבית מקושט ושמחים שתבקרו להסתכל — בלי ממתקים כרגע.
        </p>
      ) : null}
      {house.arrival ? (
        <p className="rounded-lg bg-[#2a1638] px-3 py-2 text-sm text-amber-100">
          איך מגיעים: {house.arrival}
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
        {house.accessible ? <Badge className="bg-emerald-700 text-emerald-50">נגיש</Badge> : null}
        {house.status === "pending" ? <Badge variant="secondary">ממתין לאישור</Badge> : null}
        <Badge variant="outline">{visitLabels[effectiveVisit(house)]}</Badge>
        {house.treats.map((t) => {
          const level = treatLevel(house, t);
          return (
            <Badge
              key={t}
              variant="outline"
              className={
                level === "out"
                  ? "border-red-400/40 text-red-200 line-through"
                  : level === "low"
                    ? "border-amber-400/50 text-amber-100"
                    : "border-orange-400/30 text-orange-100"
              }
            >
              {treatLabels[t]} · {stockLabels[level]}
            </Badge>
          );
        })}
      </div>
      {house.notes ? (
        <p className="text-sm text-amber-200/90">הערה: {house.notes}</p>
      ) : null}
      <CodesCopy id={house.id} editCode={editCode} />
      <div className="flex flex-wrap gap-2 pt-1">
        <a
          href={waze}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonVariants({ size: "sm" }))}
        >
          ניווט ב־Waze
        </a>
        <a
          href={maps}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        >
          Google Maps
        </a>
        <Link
          href={`/house/${encodeURIComponent(house.id)}`}
          className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}
        >
          קישור לבית
        </Link>
      </div>
      {extra}
    </div>
  );
}
