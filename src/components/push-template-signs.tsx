"use client";

import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { CandySign } from "@/components/candy-glyphs";
import { ClosedSign, PauseSign } from "@/components/house-tags";
import type { PushKind } from "@/lib/push-templates";
import { cn } from "@/lib/utils";

const SIGN = "size-8";

export const PUSH_TEMPLATE_DISPLAY_ORDER: PushKind[] = [
  "houseAdded",
  "onBreak",
  "backFromBreak",
  "closed",
  "decorOnly",
  "backActive",
  "candyLow",
  "candyOut",
  "candyOutClosed",
  "candyRestock",
];

export const PUSH_KIND_LABEL: Record<PushKind, string> = {
  houseAdded: "בית חדש במפה",
  onBreak: "הפסקה",
  backFromBreak: "חזרה מההפסקה",
  closed: "נסגר לביקור",
  decorOnly: "מקושט בלי ממתקים",
  backActive: "שוב פתוח",
  candyLow: "מעט ממתקים",
  candyOut: "נגמרו הממתקים",
  candyOutClosed: "נגמרו (סגור)",
  candyRestock: "חזרו למלאי",
};

export function HouseAddedSign({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-orange-500/25 text-orange-100 ring-1 ring-orange-400/40",
        SIGN,
        className,
      )}
      title="בית חדש במפה"
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-[62%]" aria-hidden focusable="false">
        <path
          fill="currentColor"
          d="M4.2 11.4 12 4.2l7.8 7.2v8.1c0 .7-.6 1.3-1.3 1.3h-4.1v-5.4h-4.8v5.4H5.5c-.7 0-1.3-.6-1.3-1.3z"
        />
      </svg>
    </span>
  );
}

export function OpenSign({ className }: { className?: string }) {
  return (
    <span
      className={cn("night-status-dot night-status-dot--lg is-open shrink-0 border-2", SIGN, className)}
      title="פתוח"
      aria-hidden
    />
  );
}

function Transition({ from, to }: { from: ReactNode; to: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-3" dir="ltr">
      <span className="inline-flex items-center gap-1">{from}</span>
      <ArrowRight className="size-5 shrink-0 text-violet-400" strokeWidth={2.75} aria-hidden />
      <span className="inline-flex items-center gap-1">{to}</span>
    </span>
  );
}

function signForKind(kind: PushKind): ReactNode {
  switch (kind) {
    case "houseAdded":
      return <HouseAddedSign />;
    case "onBreak":
      return <Transition from={<OpenSign />} to={<PauseSign className={SIGN} />} />;
    case "backFromBreak":
      return <Transition from={<PauseSign className={SIGN} />} to={<OpenSign />} />;
    case "closed":
      return (
        <Transition
          from={
            <>
              <OpenSign />
              <PauseSign className={SIGN} />
            </>
          }
          to={<ClosedSign className={SIGN} />}
        />
      );
    case "decorOnly":
      return (
        <Transition
          from={<CandySign tone="plenty" className={SIGN} />}
          to={<CandySign tone="none" className={SIGN} />}
        />
      );
    case "backActive":
      return (
        <Transition
          from={
            <>
              <ClosedSign className={SIGN} />
              <PauseSign className={SIGN} />
            </>
          }
          to={<OpenSign />}
        />
      );
    case "candyLow":
      return <Transition from={<CandySign tone="plenty" className={SIGN} />} to={<CandySign tone="low" className={SIGN} />} />;
    case "candyOut":
      return (
        <Transition
          from={
            <>
              <CandySign tone="plenty" className={SIGN} />
              <CandySign tone="low" className={SIGN} />
            </>
          }
          to={<CandySign tone="out" className={SIGN} />}
        />
      );
    case "candyOutClosed":
      return (
        <Transition
          from={
            <>
              <CandySign tone="out" className={SIGN} />
              <OpenSign />
            </>
          }
          to={
            <>
              <CandySign tone="out" className={SIGN} />
              <ClosedSign className={SIGN} />
            </>
          }
        />
      );
    case "candyRestock":
      return (
        <Transition from={<CandySign tone="out" className={SIGN} />} to={<CandySign tone="plenty" className={SIGN} />} />
      );
    default:
      return null;
  }
}

export function PushTemplateSign({ kind, className }: { kind: PushKind; className?: string }) {
  return (
    <span className={cn("inline-flex items-center", className)} aria-label={PUSH_KIND_LABEL[kind]}>
      {signForKind(kind)}
    </span>
  );
}

