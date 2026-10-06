import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Geometry traced from product reference — circle head + horn band. viewBox 0 0 24 24 */
export const IMP_HORN_BAND = {
  circle: { cx: 12, cy: 14.25, r: 6.65 },
  /** Filled horn bodies (left / right). */
  leftHorn:
    "M8.35 10.15 6.15 5.35 5.05 3.55 5.85 2.65 7.35 3.35 8.55 6.15 9.05 9.35 8.35 10.15Z",
  rightHorn:
    "M15.65 10.15 17.85 5.35 18.95 3.55 18.15 2.65 16.65 3.35 15.45 6.15 14.95 9.35 15.65 10.15Z",
  /** Thin band connecting horn bases (stroke in outline modes). */
  band: "M9.05 9.35 Q12 7.55 14.95 9.35",
  /** Optional specular dots on horns (product / large sizes). */
  leftHighlight: { cx: 7.05, cy: 5.15, r: 0.55 },
  rightHighlight: { cx: 16.95, cy: 5.15, r: 0.55 },
} as const;

export type ImpHornBandMode =
  | "outline-silhouette"
  | "outline-product"
  | "filled-mono"
  | "filled-found"
  | "filled-product";

const HORN_RED = "#e63535";
const HEAD_STROKE = "currentColor";

type ImpHornBandIconProps = {
  className?: string;
  mode?: ImpHornBandMode;
};

function HornBandSvg({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

/** ⋮ menu inactive — hollow circle + horn outlines (like SkipOutlineIcon). */
export function ImpHornBandOutlineSilhouette({ className }: { className?: string }) {
  const { circle, leftHorn, rightHorn, band } = IMP_HORN_BAND;
  return (
    <HornBandSvg className={className}>
      <circle
        cx={circle.cx}
        cy={circle.cy}
        r={circle.r}
        stroke={HEAD_STROKE}
        strokeWidth="1.85"
      />
      <path d={leftHorn} stroke={HEAD_STROKE} strokeWidth="1.85" strokeLinejoin="round" />
      <path d={rightHorn} stroke={HEAD_STROKE} strokeWidth="1.85" strokeLinejoin="round" />
      <path
        d={band}
        stroke={HEAD_STROKE}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </HornBandSvg>
  );
}

/** Reference colors on dark UI — red horns, cream circle stroke. */
export function ImpHornBandOutlineProduct({ className }: { className?: string }) {
  const { circle, leftHorn, rightHorn, band, leftHighlight, rightHighlight } = IMP_HORN_BAND;
  return (
    <HornBandSvg className={className}>
      <circle
        cx={circle.cx}
        cy={circle.cy}
        r={circle.r}
        stroke={HEAD_STROKE}
        strokeWidth="1.85"
      />
      <path d={leftHorn} fill={HORN_RED} stroke="none" />
      <path d={rightHorn} fill={HORN_RED} stroke="none" />
      <path d={band} stroke={HORN_RED} strokeWidth="1.35" strokeLinecap="round" />
      <circle cx={leftHighlight.cx} cy={leftHighlight.cy} r={leftHighlight.r} fill="#fff" opacity="0.85" />
      <circle cx={rightHighlight.cx} cy={rightHighlight.cy} r={rightHighlight.r} fill="#fff" opacity="0.85" />
    </HornBandSvg>
  );
}

/** Single-color silhouette — map / generic filled glyph. */
export function ImpHornBandFilledMono({ className }: { className?: string }) {
  const { circle, leftHorn, rightHorn, band } = IMP_HORN_BAND;
  return (
    <HornBandSvg className={className}>
      <circle cx={circle.cx} cy={circle.cy} r={circle.r} fill="currentColor" />
      <path d={leftHorn} fill="currentColor" />
      <path d={rightHorn} fill="currentColor" />
      <path
        d={band}
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </HornBandSvg>
  );
}

/** «מצאתי» — yellow imp, no ring. */
export function ImpHornBandFilledFound({ className }: { className?: string }) {
  return <ImpHornBandFilledMono className={cn("text-amber-300", className)} />;
}

/** Full-color fill like reference art (red horns + dark head). */
export function ImpHornBandFilledProduct({ className }: { className?: string }) {
  const { circle, leftHorn, rightHorn, band, leftHighlight, rightHighlight } = IMP_HORN_BAND;
  return (
    <HornBandSvg className={className}>
      <circle cx={circle.cx} cy={circle.cy} r={circle.r} fill="#3d262a" stroke="#3d262a" />
      <path d={leftHorn} fill={HORN_RED} />
      <path d={rightHorn} fill={HORN_RED} />
      <path d={band} stroke={HORN_RED} strokeWidth="1.35" strokeLinecap="round" />
      <circle cx={leftHighlight.cx} cy={leftHighlight.cy} r={leftHighlight.r} fill="#fff" opacity="0.9" />
      <circle cx={rightHighlight.cx} cy={rightHighlight.cy} r={rightHighlight.r} fill="#fff" opacity="0.9" />
    </HornBandSvg>
  );
}

export function ImpHornBandIcon({ className, mode = "outline-silhouette" }: ImpHornBandIconProps) {
  switch (mode) {
    case "outline-product":
      return <ImpHornBandOutlineProduct className={className} />;
    case "filled-mono":
      return <ImpHornBandFilledMono className={className} />;
    case "filled-found":
      return <ImpHornBandFilledFound className={className} />;
    case "filled-product":
      return <ImpHornBandFilledProduct className={className} />;
    default:
      return <ImpHornBandOutlineSilhouette className={className} />;
  }
}

export type ImpHornBandPreviewSpec = {
  id: ImpHornBandMode | "reference-png";
  title: string;
  note: string;
  render: (className?: string) => ReactNode;
};

export const IMP_HORN_BAND_PREVIEW_SPECS: ImpHornBandPreviewSpec[] = [
  {
    id: "reference-png",
    title: "מקור (העלאה שלך)",
    note: "PNG לייחוס — לא לתפריט.",
    render: (className) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/icons/imp-horn-band-reference.png"
        alt=""
        className={cn("size-7 object-contain", className)}
        width={56}
        height={56}
      />
    ),
  },
  {
    id: "outline-silhouette",
    title: "Silhouette — קווי (תפריט «מצא שדון»)",
    note: "כמו דילוג: רק מתאר, currentColor, בלי מילוי.",
    render: (className) => (
      <ImpHornBandOutlineSilhouette className={cn("size-7 text-orange-100", className)} />
    ),
  },
  {
    id: "outline-product",
    title: "Outline + קרניים אדומות",
    note: "קרוב לנכס — עיגול קרם, קרניים אדומות.",
    render: (className) => (
      <ImpHornBandOutlineProduct className={cn("size-7 text-orange-100", className)} />
    ),
  },
  {
    id: "filled-mono",
    title: "Fill — צללית אחת (currentColor)",
    note: "מילוי מלא בצבע אחד — אייקון פשוט.",
    render: (className) => (
      <ImpHornBandFilledMono className={cn("size-7 text-orange-100", className)} />
    ),
  },
  {
    id: "filled-found",
    title: "Fill — «מצאתי» (צהוב)",
    note: "מצב פעיל אחרי מציאה — בלי עיגול מסביב.",
    render: (className) => <ImpHornBandFilledFound className={cn("size-7", className)} />,
  },
  {
    id: "filled-product",
    title: "Fill — צבעי מקור",
    note: "ראש כהה + קרניים אדומות + נקודות highlight.",
    render: (className) => <ImpHornBandFilledProduct className={cn("size-7", className)} />,
  },
];

export const PREVIEW_ICON_SIZES = [
  { label: "size-4 (תפריט)", className: "size-4" },
  { label: "size-7 (⋮)", className: "size-7" },
  { label: "size-8", className: "size-8" },
] as const;
