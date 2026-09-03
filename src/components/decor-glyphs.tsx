import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DiscStrike } from "@/components/disc-strike";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="h-full w-full">
      {children}
    </svg>
  );
}

/** Live popup until a picker shape is chosen — hanging baubles. */
export function DecorGlyph() {
  return (
    <Icon>
      <path
        d="M3.2 6.4c2.8 3.6 4.6 3.6 7.4 0 2.8 3.6 4.6 3.6 7.4 0 1.4 1.8 2.2 1.8 3 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="7" cy="12.4" r="2.35" fill="currentColor" />
      <circle cx="12" cy="13.6" r="2.35" fill="currentColor" />
      <circle cx="17" cy="12.4" r="2.35" fill="currentColor" />
    </Icon>
  );
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

/** 3 — Cobweb, no spider. */
export function DecorWeb() {
  return (
    <Icon>
      <circle
        cx="12"
        cy="12"
        r="9.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M12 2.8v18.4M3.4 8.2 20.6 15.8M3.4 15.8 20.6 8.2M2.8 12h18.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <circle
        cx="12"
        cy="12"
        r="5.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <circle
        cx="12"
        cy="12"
        r="2.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
      />
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

export function DecorSign({
  on,
  className,
  Glyph = DecorGlyph,
}: {
  on: boolean;
  className?: string;
  Glyph?: () => ReactNode;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex size-8 shrink-0 items-center justify-center rounded-full",
        on ? "bg-[#c2410c] text-[#fff7ed]" : "bg-[#94a3b8] text-[#fff7ed]",
        className,
      )}
      title={on ? "מקושט" : "לא מקושט"}
      aria-label={on ? "מקושט" : "לא מקושט"}
    >
      <span className="size-[82%]">
        <Glyph />
      </span>
      {on ? null : <DiscStrike />}
    </span>
  );
}

export function DecorMark({
  labeled = false,
  className,
}: {
  labeled?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <DecorSign on />
      {labeled ? <span>מקושט</span> : <span className="sr-only">מקושט</span>}
    </span>
  );
}

export const DECOR_TONES = [
  { id: "on" as const, label: "מקושט" },
  { id: "off" as const, label: "לא מקושט" },
];

export const DECOR_OPTIONS = [
  { id: "lights3", number: 1, name: "שלוש מנורות", current: false, Glyph: DecorLights3 },
  { id: "lights6", number: 2, name: "שרשרת אורות", current: false, Glyph: DecorLights6 },
  { id: "web", number: 3, name: "קורי עכביש", current: false, Glyph: DecorWeb },
  { id: "wreath", number: 4, name: "זר", current: false, Glyph: DecorWreath },
  { id: "bunting", number: 5, name: "דגלים", current: false, Glyph: DecorBunting },
] as const;
