"use client";

import { Check, Heart } from "lucide-react";
import { formatActionCount } from "@/components/house-action-bar";
import { StrollerSign } from "@/components/symbols";
import { CandySign, candyTone } from "@/components/candy-glyphs";
import { ScareSign } from "@/components/scare-glyphs";
import { SensitivitySign } from "@/components/sensitivity-glyphs";
import { useAppNow } from "@/hooks/use-app-clock";
import { cn } from "@/lib/utils";
import { isHoursNightOver, isHoursNotYetOpen, isOnBreak } from "@/lib/hours";
import {
  effectiveVisit,
  isOwnerFrozen,
  markedGlutenFree,
  offersNutsFree,
  offersSesameFree,
  resolveDecorLevel,
  treatLevel,
} from "@/lib/house-state";
import type { DecorLevel, ScareLevel, TreatId, TreatStock } from "@/lib/types";

export function ClosedSign({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e11d48]",
        className,
      )}
      title="סגור"
      aria-label="סגור"
    >
      <span className="absolute inset-x-1.5 top-1/2 h-1.5 -translate-y-1/2 rounded-[1px] bg-white" />
    </span>
  );
}

export function PauseSign({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#6b7280]",
        className,
      )}
      title="הפסקה"
      aria-label="הפסקה"
    >
      <span className="absolute start-[28%] top-[22%] h-[56%] w-[13%] rounded-full bg-white" />
      <span className="absolute end-[28%] top-[22%] h-[56%] w-[13%] rounded-full bg-white" />
    </span>
  );
}

function TrafficCountSign({
  kind,
  count,
  large,
}: {
  kind: "saved" | "visited";
  count: number;
  large?: boolean;
}) {
  const value = Math.max(0, Math.floor(count) || 0);
  if (value <= 0) return null;
  const label = kind === "saved" ? `${value} שמרו` : `${value} ביקרו`;
  const iconBox = large ? "size-10" : "size-8";
  const mark = large ? "size-5" : "size-4";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#2a1638] text-orange-100 ring-1 ring-orange-500/25",
        large ? "h-10 pe-2.5 ps-1" : "h-8 pe-2 ps-0.5",
      )}
      title={label}
      aria-label={label}
    >
      {kind === "saved" ? (
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full bg-[#fb7185]/20 ring-1 ring-[#fb7185]/35",
            iconBox,
          )}
        >
          <Heart className={cn(mark, "fill-current text-[#fb7185]")} strokeWidth={2.2} />
        </span>
      ) : (
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white",
            iconBox,
          )}
        >
          <Check className={mark} strokeWidth={3} />
        </span>
      )}
      <span className={cn("font-bold tabular-nums", large ? "text-lg" : "text-base")}>
        {formatActionCount(value)}
      </span>
    </span>
  );
}

export function HouseTags({
  house,
  large = false,
  savedCount,
  visitedCount,
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
    adminFrozen?: boolean;
    ownerFrozenUntil?: string | null;
    openFrom?: string;
    openTo?: string;
    openFrom2?: string;
    openTo2?: string;
    openHours?: { from: string; to: string }[];
  };
  large?: boolean;
  savedCount?: number;
  visitedCount?: number;
}) {
  const now = useAppNow();
  const treats = house.treats ?? [];
  const withTreats = { treats, treatStock: house.treatStock };
  const scare = house.scareLevel ?? "mild";
  const candy = candyTone(withTreats);
  const gluten = markedGlutenFree(withTreats);
  const glutenOut = gluten && treatLevel(withTreats, "glutenFree") === "out";
  const undecorated = resolveDecorLevel(house) === "none";
  const eveningMin = now.getHours() * 60 + now.getMinutes();
  const closedInsteadOfCandy =
    effectiveVisit(house) === "closed" ||
    isHoursNightOver(house, now) ||
    (eveningMin >= 17 * 60 && isHoursNotYetOpen(house, now));
  const pausedInsteadOfCandy =
    !closedInsteadOfCandy &&
    (isOwnerFrozen(house, now.getTime()) || isOnBreak(house, now));
  const signSize = large ? "size-10" : undefined;
  const showCandy =
    (!closedInsteadOfCandy && !pausedInsteadOfCandy) || candy !== "none";
  const showSaved = savedCount !== undefined && Math.max(0, Math.floor(savedCount) || 0) > 0;
  const showVisited = visitedCount !== undefined && Math.max(0, Math.floor(visitedCount) || 0) > 0;
  const showTrafficRow = showSaved || showVisited;

  return (
    <div className={cn("space-y-1.5", large && "space-y-2")}>
      <div className={cn("flex flex-wrap gap-1.5 pb-0.5 ps-0.5", large && "gap-2")}>
        {closedInsteadOfCandy ? <ClosedSign className={signSize} /> : null}
        {pausedInsteadOfCandy ? <PauseSign className={signSize} /> : null}
        {showCandy ? <CandySign tone={candy} className={signSize} /> : null}
        <ScareSign level={undecorated ? "none" : scare} className={signSize} />
        {house.accessible ? (
          <span title="נגיש" aria-label="נגיש">
            <StrollerSign className={signSize} />
          </span>
        ) : null}
        {gluten ? <SensitivitySign kind="glutenFree" out={glutenOut} className={signSize} /> : null}
        {offersNutsFree(withTreats) ? <SensitivitySign kind="nutsFree" className={signSize} /> : null}
        {offersSesameFree(withTreats) ? <SensitivitySign kind="sesameFree" className={signSize} /> : null}
      </div>
      {showTrafficRow ? (
        <div className={cn("flex flex-wrap gap-1.5 ps-0.5", large && "gap-2")}>
          {showSaved ? <TrafficCountSign kind="saved" count={savedCount!} large={large} /> : null}
          {showVisited ? <TrafficCountSign kind="visited" count={visitedCount!} large={large} /> : null}
        </div>
      ) : null}
    </div>
  );
}
