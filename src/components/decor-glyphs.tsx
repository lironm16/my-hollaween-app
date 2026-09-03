import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BADGE_TONE_CLASS } from "@/lib/badge-tones";
import { DiscStrike } from "@/components/disc-strike";
import { decorShort } from "@/lib/labels";
import type { DecorLevel } from "@/lib/types";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="h-full w-full">
      {children}
    </svg>
  );
}

const WEB_GLYPH = "/icons/decor-web-glyph.png";

function DecorWebArt() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={WEB_GLYPH} alt="" aria-hidden className="h-full w-full object-contain" />
  );
}

/** Live popup mark — picker option 3, spiderweb. */
export function DecorGlyph() {
  return <DecorWebArt />;
}

/** 3 — Cobweb, no spider (picker identity). */
export function DecorWeb() {
  return <DecorWebArt />;
}

/** 1 — Three large outdoor bulbs. */
export function DecorLights3() {
  return (
    <Icon>
      <path
        d="M3 6.2c5 4.2 13 4.2 18 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M6.4 8.2v2.2M12 9.2v2.4M17.6 8.2v2.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="6.4" cy="14.2" r="3.35" fill="currentColor" />
      <circle cx="12" cy="15.4" r="3.35" fill="currentColor" />
      <circle cx="17.6" cy="14.2" r="3.35" fill="currentColor" />
    </Icon>
  );
}

/** 2 — String of smaller fairy lights. */
export function DecorLights6() {
  return (
    <Icon>
      <path
        d="M2.4 7.2c6.2 5.4 12.8 5.4 19.2 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      {[5, 8.2, 11.4, 14.6, 17.8, 20.6].map((x, i) => {
        const y = 11.4 + (i % 2 === 0 ? 0.2 : 1.6);
        return <circle key={x} cx={x} cy={y} r="1.85" fill="currentColor" />;
      })}
    </Icon>
  );
}


/** 4 — Wreath with a bow. */
export function DecorWreath() {
  return (
    <Icon>
      <circle
        cx="12"
        cy="11.2"
        r="7.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="4.2"
      />
      <path
        fill="currentColor"
        d="M8.4 17.4c0-2.2 1.6-3.4 3.6-3.4h.1c2 0 3.6 1.2 3.6 3.4 0 .4-.6.6-1 .3L12.1 16l-2.6 1.7c-.4.3-1.1.1-1.1-.3Z"
      />
      <path
        fill="currentColor"
        d="M10.6 16.6 8.2 21.2h2.1l1.8-3.2 1.8 3.2h2.1L13.6 16.6z"
      />
    </Icon>
  );
}

/** 5 — Pennant bunting. */
export function DecorBunting() {
  return (
    <Icon>
      <path
        d="M2.2 6.2c6.4 3.6 13.2 3.6 19.6 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path fill="currentColor" d="M3.4 7.2 5.9 18 8.4 7.6z" />
      <path fill="currentColor" d="M7.6 7.8 10.1 18.4 12.6 8.2z" />
      <path fill="currentColor" d="M11.6 8.2 14.1 18.6 16.6 8.4z" />
      <path fill="currentColor" d="M15.6 8 18.1 17.8 20.6 7.4z" />
    </Icon>
  );
}

const TONE_CLASS: Record<DecorLevel, string> = {
  none: BADGE_TONE_CLASS.gray,
  mild: BADGE_TONE_CLASS.green,
  medium: BADGE_TONE_CLASS.amber,
  heavy: BADGE_TONE_CLASS.red,
};

export function DecorSign({
  level,
  on,
  className,
  Glyph,
}: {
  level?: DecorLevel;
  /** @deprecated Use `level`. true → medium, false → none. */
  on?: boolean;
  className?: string;
  Glyph?: () => ReactNode;
}) {
  const resolved: DecorLevel = level ?? (on === false ? "none" : on === true ? "medium" : "mild");
  const struck = resolved === "none";
  const useOfferedWeb = !Glyph || Glyph === DecorWeb || Glyph === DecorGlyph;
  const label = decorShort[resolved];

  return (
    <span
      className={cn(
        "relative inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full",
        TONE_CLASS[resolved],
        className,
      )}
      title={label}
      aria-label={label}
    >
      {useOfferedWeb ? (
        <span className="size-[90%]">
          <DecorWebArt />
        </span>
      ) : (
        <span className="size-[82%]">
          <Glyph />
        </span>
      )}
      {struck ? <DiscStrike /> : null}
    </span>
  );
}

export function DecorMark({
  labeled = false,
  level = "medium",
  className,
}: {
  labeled?: boolean;
  level?: DecorLevel;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <DecorSign level={level} />
      {labeled ? <span>מקושט</span> : <span className="sr-only">{decorShort[level]}</span>}
    </span>
  );
}

export const DECOR_TONES: { id: DecorLevel; label: string }[] = [
  { id: "mild", label: decorShort.mild },
  { id: "medium", label: decorShort.medium },
  { id: "heavy", label: decorShort.heavy },
  { id: "none", label: decorShort.none },
];

export const DECOR_OPTIONS = [
  { id: "lights3", number: 1, name: "שלוש מנורות", current: false, Glyph: DecorLights3 },
  { id: "lights6", number: 2, name: "שרשרת אורות", current: false, Glyph: DecorLights6 },
  { id: "web", number: 3, name: "קורי עכביש", current: true, Glyph: DecorWeb },
  { id: "wreath", number: 4, name: "זר", current: false, Glyph: DecorWreath },
  { id: "bunting", number: 5, name: "דגלים", current: false, Glyph: DecorBunting },
] as const;
