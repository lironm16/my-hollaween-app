import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DiscStrike } from "@/components/disc-strike";
import { treatLabels } from "@/lib/labels";
import type { SensitivityId } from "@/lib/types";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="h-full w-full">
      {children}
    </svg>
  );
}

export function WheatEar() {
  return (
    <Icon>
      <path
        d="M12 3.2v16.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        fill="currentColor"
        d="M12 4.2c-2.2 1.4-3.4 2.4-3.2 3.6C10.4 7.2 12 6.4 12 6.4s1.6.8 3.2 1.4c.2-1.2-1-2.2-3.2-3.6Zm-3.4 4.4C7.4 10.4 8.4 12 10.2 12.2 9.4 10.6 10.6 9.2 12 8.6c-1.4.2-2.8.8-3.4 2Zm6.8 0c-.6-1.2-2-1.8-3.4-2 1.4.6 2.6 2 1.8 3.6 1.8-.2 2.8-1.8 1.6-3.6ZM8.8 13c-.6 1.8.6 3.2 2.4 3.2-1.2-1.4-.4-2.8.8-3.6-1.2.2-2.4.2-3.2.4Zm6.4 0c-.8-.2-2-.2-3.2-.4 1.2.8 2 2.2.8 3.6 1.8 0 3-1.4 2.4-3.2Z"
      />
    </Icon>
  );
}

export function Peanut() {
  return (
    <Icon>
      <path
        fill="currentColor"
        d="M9.2 5.4c1.4-1.8 4.2-1.8 5.6 0 1.2 1.5.8 3.4-.2 4.4 1 .9 1.6 2.6.6 4.2-1.4 2.2-4.6 2.4-6.2.4-1.2-1.5-.8-3.4.3-4.4-1.1-1-.1.6-3.6-.4 1.4-1.6 1.8-2.8.9-4.2Z"
      />
    </Icon>
  );
}

export function SesameSeeds() {
  return (
    <Icon>
      <ellipse cx="8.2" cy="9.2" rx="2.3" ry="3.1" fill="currentColor" transform="rotate(-28 8.2 9.2)" />
      <ellipse cx="15.6" cy="8.6" rx="2.2" ry="3" fill="currentColor" transform="rotate(22 15.6 8.6)" />
      <ellipse cx="12" cy="15.4" rx="2.4" ry="3.2" fill="currentColor" transform="rotate(8 12 15.4)" />
    </Icon>
  );
}

export function BreadLoaf() {
  return (
    <Icon>
      <path
        fill="currentColor"
        d="M4.4 10.2C4.4 6.8 7.6 4.4 12 4.4s7.6 2.4 7.6 5.8v7.4c0 1.2-1.2 2.2-2.6 2.2H7c-1.4 0-2.6-1-2.6-2.2z"
      />
      <path
        d="M8.2 8.2c.8 1.2 1.6 1.4 2.4.2M11.4 7.6c.8 1.3 1.7 1.4 2.6.1M14.8 8.4c.7 1.1 1.5 1.2 2.2.2"
        fill="none"
        stroke="#1c0e24"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </Icon>
  );
}

export function AlmondPair() {
  return (
    <Icon>
      <ellipse cx="9.2" cy="12.2" rx="3.4" ry="6.2" fill="currentColor" transform="rotate(-28 9.2 12.2)" />
      <ellipse cx="15.2" cy="12.6" rx="3.2" ry="5.8" fill="currentColor" transform="rotate(24 15.2 12.6)" />
    </Icon>
  );
}

export function SesameDonut() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="8.2" fill="currentColor" />
      <circle cx="12" cy="12" r="3.1" fill="#92400e" />
      {[0, 40, 80, 130, 175, 220, 265, 310].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const cx = 12 + Math.cos(rad) * 5.4;
        const cy = 12 + Math.sin(rad) * 5.4;
        return <circle key={deg} cx={cx} cy={cy} r="0.7" fill="#1c0e24" />;
      })}
    </Icon>
  );
}

export function WheatStylized() {
  return (
    <Icon>
      <path
        d="M12 3.4v17"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {[5.2, 8.4, 11.6, 14.8].map((y) => (
        <path
          key={y}
          fill="currentColor"
          d={`M12 ${y}c-3.2-1.2-5.2.2-4.8 1.8C9.4 ${y + 0.4} 12 ${y} 12 ${y}c0 0 2.6.4 4.8 1.8.4-1.6-1.6-3-4.8-1.8Z`}
        />
      ))}
    </Icon>
  );
}

export function CrackedNut() {
  return (
    <Icon>
      <path
        fill="currentColor"
        d="M12 3.6c3.8 0 6.8 3.4 6.8 7.6 0 4.8-2.8 9.2-6.8 9.2S5.2 16 5.2 11.2C5.2 7 8.2 3.6 12 3.6Z"
      />
      <path
        d="M12 6.4v12.2"
        fill="none"
        stroke="#1c0e24"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="0 0"
      />
    </Icon>
  );
}

export function SesameFlower() {
  return (
    <Icon>
      {[0, 72, 144, 216, 288].map((deg) => {
        const rad = ((deg - 90) * Math.PI) / 180;
        const cx = 12 + Math.cos(rad) * 5.2;
        const cy = 12 + Math.sin(rad) * 5.2;
        return (
          <ellipse
            key={deg}
            cx={cx}
            cy={cy}
            rx="2.1"
            ry="2.9"
            fill="currentColor"
            transform={`rotate(${deg} ${cx} ${cy})`}
          />
        );
      })}
    </Icon>
  );
}

export function WheatField() {
  return (
    <Icon>
      <path
        d="M8.4 4.2v13.6M15.6 5v12.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path fill="currentColor" d="M8.4 4.6c-2.6 1.4-3.6 2.8-3 4.2 1.6-.8 3-.8 3-.8s1.2.4 3 1.2c.4-1.4-1.2-3-3-4.6Zm7.2.6c-2.4 1.2-3.4 2.6-2.8 4 1.4-.8 2.8-.8 2.8-.8s1.2.4 2.8 1.2c.4-1.4-1-2.8-2.8-4.4Z" />
      <path
        d="M3.6 19.2c2.8-1.4 5.2-1.6 8.4-.2 3.2 1.4 5.8 1.2 8.4-.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </Icon>
  );
}

export function Walnut() {
  return (
    <Icon>
      <path
        fill="currentColor"
        d="M12 3.8c4 0 7.2 3.2 7.2 7.6 0 5-3.2 9-7.2 9s-7.2-4-7.2-9c0-4.4 3.2-7.6 7.2-7.6Z"
      />
      <path
        d="M12 6.2s1.6 2.2 1.6 5.2S12 17.8 12 17.8 10.4 14.4 10.4 11.4 12 6.2 12 6.2Z"
        fill="none"
        stroke="#1c0e24"
        strokeWidth="1.3"
      />
    </Icon>
  );
}

export function SesamePlant() {
  return (
    <Icon>
      <path
        d="M12 20.4V11.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path fill="currentColor" d="M7.2 9.4c0-3.2 2.2-5.8 4.8-6.2 2.6.4 4.8 3 4.8 6.2 0 2.2-1.6 4-4.8 4.4-3.2-.4-4.8-2.2-4.8-4.4Z" />
      <circle cx="10.4" cy="9.2" r="0.85" fill="#1c0e24" />
      <circle cx="13.6" cy="8.6" r="0.85" fill="#1c0e24" />
      <circle cx="12" cy="11.2" r="0.85" fill="#1c0e24" />
      <path fill="currentColor" d="M6.2 13.2c1.6-2 3.2-2.2 4.4-1.2-1.4 1.4-2.4 3-3.2 4.4-.8-1.2-1.2-2.2-1.2-3.2Zm11.6 0c0 1-.4 2-1.2 3.2-.8-1.4-1.8-3-3.2-4.4 1.2-1 2.8-.8 4.4 1.2Z" />
    </Icon>
  );
}

const KIND_LABEL: Record<SensitivityId, string> = {
  glutenFree: treatLabels.glutenFree,
  nutsFree: treatLabels.nutsFree,
  sesameFree: treatLabels.sesameFree,
};

export function SensitivitySign({
  Glyph,
  kind,
  out = false,
  className,
}: {
  Glyph: () => ReactNode;
  kind: SensitivityId;
  out?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-800 text-amber-50",
        className,
      )}
      title={KIND_LABEL[kind]}
      aria-label={KIND_LABEL[kind]}
    >
      <span className="size-[78%]">
        <Glyph />
      </span>
      {out ? <DiscStrike /> : null}
    </span>
  );
}

export const SENSITIVITY_KINDS: { id: SensitivityId; label: string }[] = [
  { id: "glutenFree", label: treatLabels.glutenFree },
  { id: "nutsFree", label: treatLabels.nutsFree },
  { id: "sesameFree", label: treatLabels.sesameFree },
];

export const SENSITIVITY_SETS = [
  {
    id: "slash",
    number: 1,
    name: "עם קו — אין אלרגן",
    blurb: "חיטה, בוטן ושומשום עם קו. הכי דומה לשלט אלרגיה.",
    gluten: WheatEar,
    nuts: Peanut,
    sesame: SesameSeeds,
    slash: true,
  },
  {
    id: "plain",
    number: 2,
    name: "המזון עצמו",
    blurb: "חיטה, בוטן וגרעיני שומשום בלי קו.",
    gluten: WheatEar,
    nuts: Peanut,
    sesame: SesameSeeds,
    slash: false,
  },
  {
    id: "food",
    number: 3,
    name: "לחם · שקדים · דונאט",
    blurb: "מאכלים מוכרים.",
    gluten: BreadLoaf,
    nuts: AlmondPair,
    sesame: SesameDonut,
    slash: false,
  },
  {
    id: "geo",
    number: 4,
    name: "גיאומטרי",
    blurb: "חיטה מסוגננת, אגוז סדוק, שומשום בפרח.",
    gluten: WheatStylized,
    nuts: CrackedNut,
    sesame: SesameFlower,
    slash: false,
  },
  {
    id: "plant",
    number: 5,
    name: "מהשדה",
    blurb: "שתי שיבולים, אגוז מלך, צמח שומשום.",
    gluten: WheatField,
    nuts: Walnut,
    sesame: SesamePlant,
    slash: false,
  },
] as const;
