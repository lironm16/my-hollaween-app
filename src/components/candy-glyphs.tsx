import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BADGE_TONE_CLASS } from "@/lib/badge-tones";
import { candyLevel, markedCandy } from "@/lib/house-state";
import type { TreatId, TreatStock } from "@/lib/types";
import { stockLabels } from "@/lib/labels";
import { DiscStrike } from "@/components/disc-strike";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="h-full w-full">
      {children}
    </svg>
  );
}

/** 1 — Classic double-twist wrapper. */
export function CandyTwist() {
  return (
    <Icon>
      <path
        fill="currentColor"
        d="M2.2 9.4 6.4 12 2.2 14.6v-5.2Zm19.6 0V14.6L17.6 12l4.2-2.6ZM7.1 8.2h9.8c.9 0 1.6.8 1.6 1.7v4.2c0 .9-.7 1.7-1.6 1.7H7.1c-.9 0-1.6-.8-1.6-1.7v-4.2c0-.9.7-1.7 1.6-1.7Z"
      />
    </Icon>
  );
}

/** 2 — Round wrapped sweet. */
export function CandyRound() {
  return (
    <Icon>
      <path fill="currentColor" d="M2.4 9.2 6.8 12 2.4 14.8V9.2Zm19.2 0v5.6L17.2 12l4.4-2.8Z" />
      <circle cx="12" cy="12" r="5.4" fill="currentColor" />
    </Icon>
  );
}

/** 3 — Lollipop. */
export function CandyLollipop() {
  return (
    <Icon>
      <circle cx="12" cy="8.6" r="6.1" fill="currentColor" />
      <path
        d="M12 14.6v7.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </Icon>
  );
}

/** 4 — Candy cane. */
export function CandyCane() {
  return (
    <Icon>
      <path
        d="M8.2 6.4c0-2.6 2.2-4.6 5-4.6s5 2 5 4.6c0 1.6-1 3-2.5 3.8L9.4 21.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Icon>
  );
}

/** 5 — Pair of small wrapped candies. */
export function CandyPair() {
  return (
    <Icon>
      <path
        fill="currentColor"
        transform="rotate(-28 9 9)"
        d="M1.6 7.4 4.6 9.2 1.6 11V7.4ZM14.8 7.4V11L11.8 9.2l3-1.8ZM5.4 6.8h6.2c.6 0 1.1.5 1.1 1.1v2.6c0 .6-.5 1.1-1.1 1.1H5.4c-.6 0-1.1-.5-1.1-1.1V7.9c0-.6.5-1.1 1.1-1.1Z"
      />
      <path
        fill="currentColor"
        transform="rotate(22 15.5 15.5)"
        d="M8.4 13.6 11.4 15.4 8.4 17.2v-3.6ZM21.6 13.6v3.6L18.6 15.4l3-1.8ZM12.2 13h6.2c.6 0 1.1.5 1.1 1.1v2.6c0 .6-.5 1.1-1.1 1.1h-6.2c-.6 0-1.1-.5-1.1-1.1v-2.6c0-.6.5-1.1 1.1-1.1Z"
      />
    </Icon>
  );
}

export type CandyTone = "plenty" | "low" | "out" | "none";

const TONE_CLASS: Record<CandyTone, string> = {
  plenty: BADGE_TONE_CLASS.green,
  low: BADGE_TONE_CLASS.amber,
  out: BADGE_TONE_CLASS.red,
  none: BADGE_TONE_CLASS.gray,
};

export function candyTone(house: { treats?: TreatId[]; treatStock?: TreatStock }): CandyTone {
  const treats = house.treats ?? [];
  if (!markedCandy({ treats })) return "none";
  const level = candyLevel({ treats, treatStock: house.treatStock });
  if (level === "low") return "low";
  if (level === "out") return "out";
  return "plenty";
}

export function candyToneLabel(tone: CandyTone) {
  if (tone === "none") return "בלי ממתקים";
  return `ממתקים · ${stockLabels[tone]}`;
}

const CANDY_ART: Record<CandyTone, string> = {
  plenty: "/icons/candy-round-cream.png",
  low: "/icons/candy-round-dark.png",
  out: "/icons/candy-round-cream.png",
  none: "/icons/candy-round-cream.png",
};

export function CandySign({
  Glyph,
  tone,
  className,
}: {
  Glyph?: () => ReactNode;
  tone: CandyTone;
  className?: string;
}) {
  const useOffered = !Glyph || Glyph === CandyRound;
  return (
    <span
      className={cn(
        "relative inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full",
        TONE_CLASS[tone],
        className,
      )}
      title={candyToneLabel(tone)}
      aria-label={candyToneLabel(tone)}
    >
      {useOffered ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={CANDY_ART[tone]}
          alt=""
          aria-hidden
          className="h-auto w-[90%] object-contain"
        />
      ) : (
        <span className="size-[86%]">
          <Glyph />
        </span>
      )}
      {tone === "none" ? <DiscStrike /> : null}
    </span>
  );
}

export function CandyMark({
  labeled = false,
  tone = "plenty",
  className,
}: {
  labeled?: boolean;
  tone?: CandyTone;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <CandySign tone={tone} />
      {labeled ? <span>יש ממתקים</span> : <span className="sr-only">{candyToneLabel(tone)}</span>}
    </span>
  );
}

export const CANDY_TONES: { id: CandyTone; label: string }[] = [
  { id: "plenty", label: "יש" },
  { id: "low", label: "מעט" },
  { id: "out", label: "נגמר" },
  { id: "none", label: "בלי ממתקים מההתחלה" },
];

export const CANDY_OPTIONS = [
  { id: "twist", number: 1, name: "סוכרייה עטופה", current: false, Glyph: CandyTwist },
  { id: "round", number: 2, name: "עגולה עטופה", current: true, Glyph: CandyRound },
  { id: "lollipop", number: 3, name: "סוכרייה על מקל", current: false, Glyph: CandyLollipop },
  { id: "cane", number: 4, name: "מקל סוכר", current: false, Glyph: CandyCane },
  { id: "pair", number: 5, name: "שתי סוכריות", current: false, Glyph: CandyPair },
] as const;
