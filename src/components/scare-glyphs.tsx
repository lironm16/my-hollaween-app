import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { scareShort } from "@/lib/labels";
import type { ScareLevel } from "@/lib/types";
import { DiscStrike } from "@/components/disc-strike";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="h-full w-full">
      {children}
    </svg>
  );
}

/** 1 — Ghost. */
export function ScareGhost() {
  return (
    <Icon>
      <path
        fill="currentColor"
        d="M12 2.4c3.7 0 6.4 2.9 6.4 6.8v11.1c0 .7-.8 1.1-1.3.6L15.4 19l-1.7 1.9-1.7-1.9-1.7 1.9-1.7-1.9-1.7 1.9c-.5.5-1.3.1-1.3-.6V9.2C5.6 5.3 8.3 2.4 12 2.4Z"
      />
      <circle cx="9.6" cy="10.2" r="1.15" fill="#1c0e24" />
      <circle cx="14.4" cy="10.2" r="1.15" fill="#1c0e24" />
    </Icon>
  );
}

/** 2 — Skull. */
export function ScareSkull() {
  return (
    <Icon>
      <path
        fill="currentColor"
        d="M12 2.6c4.1 0 7.2 3 7.2 6.8 0 2.4-1.2 4.4-3.1 5.6v3.4c0 .7-.6 1.3-1.3 1.3H9.2c-.7 0-1.3-.6-1.3-1.3v-3.4C6 13.8 4.8 11.8 4.8 9.4 4.8 5.6 7.9 2.6 12 2.6Z"
      />
      <circle cx="9.3" cy="10.1" r="1.55" fill="#1c0e24" />
      <circle cx="14.7" cy="10.1" r="1.55" fill="#1c0e24" />
      <path fill="#1c0e24" d="M12 12.2 13.2 15h-2.4z" />
    </Icon>
  );
}

/** 3 — Spider. */
export function ScareSpider() {
  return (
    <Icon>
      <path
        d="M4.2 8.2 9 11.2M19.8 8.2 15 11.2M3.6 13.2 9.2 13M20.4 13.2 14.8 13M4.8 18.4 9.4 14.6M19.2 18.4 14.6 14.6M6.2 5.4 10 10M17.8 5.4 14 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <ellipse cx="12" cy="12.4" rx="3.4" ry="4.1" fill="currentColor" />
      <circle cx="12" cy="8.3" r="2.15" fill="currentColor" />
    </Icon>
  );
}

/** 4 — Bat. */
export function ScareBat() {
  return (
    <Icon>
      <path
        fill="currentColor"
        d="M12 9.2c1.4-2.6 3.6-4.8 6.6-5.6-1.1 2.2-.6 4.3.8 6.2 1.6 2.1 3.4 3.3 4.4 3.2-2.2 1.1-4.1.6-6.2-.4L12 20.4 6.4 12.6c-2.1 1-4 .8-6.2-.4 1-.1 2.8-1.1 4.4-3.2 1.4-1.9 1.9-4 .8-6.2 3 .8 5.2 3 6.6 5.6Z"
      />
    </Icon>
  );
}

/** 5 — Jack-o’-lantern. */
export function ScarePumpkin() {
  return (
    <Icon>
      <path fill="currentColor" d="M11.2 2.4h1.6c.5 0 .9.5.8 1l-.4 2.1h-2.4l-.4-2.1c-.1-.5.3-1 .8-1Z" />
      <ellipse cx="12" cy="13.2" rx="8.4" ry="7.6" fill="currentColor" />
      <path fill="#1c0e24" d="M8.4 10.4 10.6 12 8.4 12.6zm7.2 0L13.4 12l2.2.6zM8.2 15.4 12 18.2l3.8-2.8-1.4.2L12 16.6l-2.4-1z" />
    </Icon>
  );
}

const TONE_CLASS: Record<ScareLevel | "none", string> = {
  mild: "bg-[#047857] text-[#fff7ed]",
  medium: "bg-[#d97706] text-[#1c0e24]",
  spicy: "bg-[#b91c1c] text-[#fff7ed]",
  none: "bg-[#94a3b8] text-[#fff7ed]",
};

export function ScareSign({
  Glyph,
  level,
  className,
}: {
  Glyph: () => ReactNode;
  level: ScareLevel | "none";
  className?: string;
}) {
  const struck = level === "none";
  return (
    <span
      className={cn(
        "relative inline-flex size-8 shrink-0 items-center justify-center rounded-full",
        TONE_CLASS[level],
        className,
      )}
      title={struck ? "לא מקושט" : scareShort[level]}
      aria-label={struck ? "לא מקושט" : scareShort[level]}
    >
      <span className="size-[70%]">
        <Glyph />
      </span>
      {struck ? <DiscStrike /> : null}
    </span>
  );
}

export const SCARE_TONES: { id: ScareLevel | "none"; label: string }[] = [
  { id: "mild", label: scareShort.mild },
  { id: "medium", label: scareShort.medium },
  { id: "spicy", label: scareShort.spicy },
  { id: "none", label: "לא מקושט" },
];

export const SCARE_OPTIONS = [
  { id: "ghost", number: 1, name: "רוח", Glyph: ScareGhost },
  { id: "skull", number: 2, name: "גולגולת", Glyph: ScareSkull },
  { id: "spider", number: 3, name: "עכביש", Glyph: ScareSpider },
  { id: "bat", number: 4, name: "עטלף", Glyph: ScareBat },
  { id: "pumpkin", number: 5, name: "דלעת", Glyph: ScarePumpkin },
] as const;
