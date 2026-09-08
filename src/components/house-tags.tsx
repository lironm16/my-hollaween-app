"use client";

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

function ClosedSign({ className }: { className?: string }) {
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

function PauseSign({ className }: { className?: string }) {
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

export function HouseTags({
  house,
  large = false,
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
  const statusSign = closedInsteadOfCandy ? (
    <ClosedSign className={signSize} />
  ) : pausedInsteadOfCandy ? (
    <PauseSign className={signSize} />
  ) : (
    <CandySign tone={candy} className={signSize} />
  );

  return (
    <div className={cn("flex flex-wrap gap-1.5 pb-0.5 ps-0.5", large && "gap-2")}>
      {statusSign}
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
  );
}
