import { cn } from "@/lib/utils";

const PIN_BG = "#6d28d9";

type HoursKind = "opening" | "closing";

const LABELS: Record<HoursKind, string> = {
  opening: "נפתח בקרוב",
  closing: "נסגר בקרוב",
};

const RIBBON_LABELS: Record<HoursKind, string> = {
  opening: "פתיחה",
  closing: "סגירה",
};

function PinClockGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <path
        d="M12 7.2v5.1l3.4 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export type HoursSoonBadgeVariant =
  | "ring-current"
  | "top-pill"
  | "ribbon"
  | "side-dot"
  | "clock"
  | "colored-frame";

function HoursSoonBadge({
  kind,
  variant,
}: {
  kind: HoursKind;
  variant: Exclude<HoursSoonBadgeVariant, "ring-current" | "colored-frame">;
}) {
  const tone = kind === "opening" ? "is-opening" : "is-closing";
  if (variant === "top-pill") {
    return (
      <span className={cn("pin-hours-badge variant-top-pill", tone)} aria-hidden>
        {LABELS[kind]}
      </span>
    );
  }
  if (variant === "ribbon") {
    return (
      <span className={cn("pin-hours-badge variant-ribbon", tone)} aria-hidden>
        {RIBBON_LABELS[kind]}
      </span>
    );
  }
  if (variant === "side-dot") {
    return <span className={cn("pin-hours-badge variant-side-dot", tone)} aria-hidden />;
  }
  return (
    <span className={cn("pin-hours-badge variant-clock", tone)} aria-hidden>
      <PinClockGlyph />
    </span>
  );
}

export function HoursSoonPinDemo({
  kind,
  variant,
  withCandyDot = true,
  size = "map",
  className,
}: {
  kind: HoursKind;
  variant: HoursSoonBadgeVariant;
  withCandyDot?: boolean;
  size?: "map" | "dot";
  className?: string;
}) {
  const soonClass = kind === "opening" ? "is-opening-soon" : "is-closing-soon";
  const frameClass = variant === "colored-frame" ? "is-hours-badge-frame" : "";
  const label = LABELS[kind];

  return (
    <div
      className={cn(
        "house-pin relative shrink-0",
        size === "dot" && "house-pin-dot",
        soonClass,
        frameClass,
        className,
      )}
      style={{ background: PIN_BG }}
      aria-label={label}
    >
      {variant === "ring-current" ? (
        <i className={`pin-hours-ring is-${kind === "opening" ? "opening" : "closing"}`} aria-hidden />
      ) : null}
      {variant !== "ring-current" && variant !== "colored-frame" ? (
        <HoursSoonBadge kind={kind} variant={variant} />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="pin-scare" src="/icons/pin-scare-mild.png" alt="" />
      {withCandyDot ? <b className="pin-status is-plenty" aria-hidden /> : null}
    </div>
  );
}

export const HOURS_SOON_BADGE_OPTIONS: {
  id: HoursSoonBadgeVariant;
  title: string;
  blurb: string;
}[] = [
  {
    id: "ring-current",
    title: "א · עיגול מהבהב (היום)",
    blurb: "טבעת כתומה/טורקיז סביב הסיכה עם אנימציית fade — מה שיש עכשיו במפה ובמקרא.",
  },
  {
    id: "top-pill",
    title: "ב · תג עליון",
    blurb: "גלולה קטנה מעל הסיכה עם «נפתח בקרוב» / «נסגר בקרוב» — קריא בלי לכסות את הרוח.",
  },
  {
    id: "ribbon",
    title: "ג · סרט קצר למטה",
    blurb: "תווית דקה מתחת לסיכה: «פתיחה» / «סגירה» — פחות טקסט, לא חופף את נקודת הממתקים.",
  },
  {
    id: "clock",
    title: "ד · שעון בפינה",
    blurb: "דיסק צבעוני עם אייקון שעון (כמו בסינון שעות) בפינה העליונה — בלי מילים על הסיכה.",
  },
  {
    id: "side-dot",
    title: "ה · נקודת צבע בצד",
    blurb: "נקודה קטנה בצד — מינימלי; המשמעות מגיעה מהמקרא / מהטקסט בכרטיס.",
  },
  {
    id: "colored-frame",
    title: "ו · מסגרת צבע (בלי תג)",
    blurb: "הילה צבעונית קבועה סביב הסיכה (לא מהבהב) — בלי טקסט, רק שינוי מסגרת.",
  },
];

export function HoursSoonLegendPair({
  variant,
  className,
}: {
  variant: HoursSoonBadgeVariant;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap justify-center gap-8", className)}>
      {(["opening", "closing"] as const).map((kind) => (
        <div key={kind} className="flex flex-col items-center gap-2">
          <HoursSoonPinDemo kind={kind} variant={variant} withCandyDot={false} />
          <span className="max-w-[7.5rem] text-center text-base leading-snug text-orange-100">
            {LABELS[kind]}
          </span>
        </div>
      ))}
    </div>
  );
}
