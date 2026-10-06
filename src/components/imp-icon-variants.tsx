import type { ReactNode } from "react";

import { ImpMarkerGlyph } from "@/components/imp-marker-glyph";
import { cn } from "@/lib/utils";

export type ImpIconVariantId =
  | "png-mask-solid"
  | "png-mask-eyes"
  | "svg-outline-current"
  | "svg-outline-bold"
  | "svg-outline-horns"
  | "svg-outline-fresh-a"
  | "svg-outline-fresh-b"
  | "svg-filled"
  | "svg-filled-fresh"
  | "svg-filled-soft"
  | "svg-duotone";

/** Current menu SVG (v1). */
export function ImpSvgOutlineCurrent({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M8 9.5 6.5 5.5 9 8" />
      <path d="M16 9.5 17.5 5.5 15 8" />
      <path d="M9 8.5c0-2 1.35-3.5 3-3.5s3 1.5 3 3.5" />
      <path d="M8.5 10c.65 4 1.75 7.5 3.5 7.5S17.35 14 18 10" />
      <path d="M10.25 12.25c.45.35.85.35 1.25 0" />
      <path d="M13.5 12.25c.45.35.85.35 1.25 0" />
    </svg>
  );
}

/** Round head + curved horns — outline only. */
export function ImpSvgOutlineHorns({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M7.5 9.5 6 5.5 8.5 8.5" />
      <path d="M16.5 9.5 18 5.5 15.5 8.5" />
      <ellipse cx="12" cy="13.5" rx="5.25" ry="6.25" />
      <path d="M9.75 13.25c.55.45 1.05.45 1.6 0" />
      <path d="M13.65 13.25c.55.45 1.05.45 1.6 0" />
      <path d="M10.5 16.25c.85.65 1.65.95 2.5.95s1.65-.3 2.5-.95" />
    </svg>
  );
}

/** Fresh — short horns + rounded head (Lucide-adjacent). */
export function ImpSvgOutlineFreshA({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M8.25 9.5 7 5.75 9.75 8.75" />
      <path d="M15.75 9.5 17 5.75 14.25 8.75" />
      <path d="M12 7.25c3.15 0 5.25 2.35 5.25 5.75 0 3.15-2.35 5.75-5.25 5.75S6.75 16.15 6.75 13c0-3.4 2.1-5.75 5.25-5.75z" />
      <ellipse cx="10.35" cy="12.85" rx="0.85" ry="1.05" fill="currentColor" stroke="none" />
      <ellipse cx="13.65" cy="12.85" rx="0.85" ry="1.05" fill="currentColor" stroke="none" />
      <path d="M10.75 15.85c.65.55 1.35.85 2.25.85s1.6-.3 2.25-.85" />
    </svg>
  );
}

/** Fresh — pointed chin + tall horns (mask-like). */
export function ImpSvgOutlineFreshB({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M6.75 10.25 5 4.5 8.75 9" />
      <path d="M17.25 10.25 19 4.5 15.25 9" />
      <path d="M12 6.75c-3.6 0-6 2.85-6 6.35 0 2.1 1.05 3.95 2.75 5.05L12 21l3.25-2.85c1.7-1.1 2.75-2.95 2.75-5.05 0-3.5-2.4-6.35-6-6.35z" />
      <ellipse cx="10.2" cy="12.6" rx="0.9" ry="1.1" fill="currentColor" stroke="none" />
      <ellipse cx="13.8" cy="12.6" rx="0.9" ry="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Fresh filled silhouette (same as Fresh B). */
export function ImpSvgFilledFresh({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M6.75 10.25 5 4.5 8.75 9 8.5 9.35C6.35 10.05 5 12.05 5 14.1c0 1.85.85 3.55 2.35 4.65L12 21l4.65-2.25c1.5-1.1 2.35-2.8 2.35-4.65 0-2.05-1.35-4.05-3.5-4.75-.25-.35-.25-.9 0-1.35L17.25 10.25 19 4.5 15.25 9c-.25.35-.75.35-1 0-.9-1.15-2.35-1.85-4-1.85s-3.1.7-4 1.85c-.25.35-.75.35-1 0L5 4.5l1.75 5.75z"
      />
      <ellipse cx="10.2" cy="12.6" rx="0.95" ry="1.15" fill="#1d1028" />
      <ellipse cx="13.8" cy="12.6" rx="0.95" ry="1.15" fill="#1d1028" />
    </svg>
  );
}

/** Thicker stroke for small sizes. */
export function ImpSvgOutlineBold({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M8 9 6 4.5 9.25 8" />
      <path d="M16 9 18 4.5 14.75 8" />
      <path d="M8.75 9.25c0-2.2 1.45-3.75 3.25-3.75s3.25 1.55 3.25 3.75v.5" />
      <path d="M8.25 10.25c.7 4.25 2 7.75 3.75 7.75s3.05-3.5 3.75-7.75" />
      <circle cx="10.5" cy="12.75" r="0.65" fill="currentColor" stroke="none" />
      <circle cx="13.5" cy="12.75" r="0.65" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Same horns shape — filled silhouette (SVG, not PNG). */
export function ImpSvgFilled({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M8.2 9.1 6.4 5.2 8.9 7.9c-.9-.35-1.6-1.2-1.6-2.35 0-1.65 1.35-3 3.7-3 2.35 0 3.7 1.35 3.7 3 0 1.15-.7 2-1.6 2.35l2.5-2.7-1.8 3.9c1.65.55 2.85 2.85 2.85 5.35 0 .85-.15 1.65-.45 2.35H8.75c-.3-.7-.45-1.5-.45-2.35 0-2.5 1.2-4.8 2.85-5.35Z" />
      <ellipse cx="9.6" cy="12.9" rx="1" ry="1.15" fill="#1d1028" />
      <ellipse cx="14.4" cy="12.9" rx="1" ry="1.15" fill="#1d1028" />
    </svg>
  );
}

/** Fill + stroke — reads on dark menus. */
export function ImpSvgDuotone({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M8.2 9.1 6.4 5.2 8.9 7.9c-.9-.35-1.6-1.2-1.6-2.35 0-1.65 1.35-3 3.7-3 2.35 0 3.7 1.35 3.7 3 0 1.15-.7 2-1.6 2.35l2.5-2.7-1.8 3.9c1.65.55 2.85 2.85 2.85 5.35 0 .85-.15 1.65-.45 2.35H8.75c-.3-.7-.45-1.5-.45-2.35 0-2.5 1.2-4.8 2.85-5.35Z"
        fill="currentColor"
        fillOpacity="0.22"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M9.75 13.1c.5.35.95.35 1.45 0M13.8 13.1c.5.35.95.35 1.45 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export type ImpIconPreviewSpec = {
  id: ImpIconVariantId;
  title: string;
  note: string;
  render: (className?: string) => ReactNode;
};

export const IMP_ICON_PREVIEW_SPECS: ImpIconPreviewSpec[] = [
  {
    id: "png-mask-solid",
    title: "PNG מסכה — מלא (מפה / שדון)",
    note: "הנכס המקורי; לפעמים נראה ריבוע רקע בתפריט.",
    render: (className) => (
      <ImpMarkerGlyph
        variant="solid"
        className={cn("size-7 text-orange-100", className)}
        style={{ WebkitMaskSize: "76%", maskSize: "76%" }}
      />
    ),
  },
  {
    id: "png-mask-eyes",
    title: "PNG — רק עיניים",
    note: "גרסה דקה מהנכס.",
    render: (className) => (
      <ImpMarkerGlyph variant="eyes" className={cn("size-7 text-orange-100", className)} />
    ),
  },
  {
    id: "svg-outline-current",
    title: "SVG קווי — v1 (תפריט היום)",
    note: "קווים בלבד, בלי מילוי.",
    render: (className) => <ImpSvgOutlineCurrent className={cn("size-7 text-orange-100", className)} />,
  },
  {
    id: "svg-outline-horns",
    title: "SVG קווי — ראש עגול + קרניים",
    note: "קווי מתאר ברורים, עיניים קשת.",
    render: (className) => <ImpSvgOutlineHorns className={cn("size-7 text-orange-100", className)} />,
  },
  {
    id: "svg-outline-bold",
    title: "SVG קווי — עבה + נקודות עין",
    note: "קריא יותר ב-size-4 / size-7.",
    render: (className) => <ImpSvgOutlineBold className={cn("size-7 text-orange-100", className)} />,
  },
  {
    id: "svg-outline-fresh-a",
    title: "SVG חדש A — ראש עגול + קרניים קצרות",
    note: "קווי מתאר בלבד; עיניים מלאות קטנות.",
    render: (className) => <ImpSvgOutlineFreshA className={cn("size-7 text-orange-100", className)} />,
  },
  {
    id: "svg-outline-fresh-b",
    title: "SVG חדש B — סנטר חד + קרניים גבוהות",
    note: "דמוי מסכה; outline בלי מילוי גוף.",
    render: (className) => <ImpSvgOutlineFreshB className={cn("size-7 text-orange-100", className)} />,
  },
  {
    id: "svg-filled",
    title: "SVG — מלא (שחור/קרם)",
    note: "צללית ממולאת ב-SVG — בלי PNG.",
    render: (className) => <ImpSvgFilled className={cn("size-7 text-orange-100", className)} />,
  },
  {
    id: "svg-filled-fresh",
    title: "SVG חדש — מלא (B)",
    note: "מילוי מלא; מתאים ל«מצאתי» בצהוב.",
    render: (className) => (
      <ImpSvgFilledFresh className={cn("size-7 text-amber-300", className)} />
    ),
  },
  {
    id: "svg-duotone",
    title: "SVG — דו-טון (מילוי עדין + קו)",
    note: "בין outline ל-filled.",
    render: (className) => <ImpSvgDuotone className={cn("size-7 text-orange-100", className)} />,
  },
  {
    id: "svg-filled-soft",
    title: "SVG — מילוי רך + קו (ניסיון)",
    note: "שקיפות + outline — לבדיקה.",
    render: (className) => (
      <span className={cn("relative inline-block size-7", className)}>
        <ImpSvgFilled className="size-7 text-orange-100 opacity-40" />
        <ImpSvgOutlineHorns className="absolute inset-0 size-7 text-orange-100" />
      </span>
    ),
  },
];

const PREVIEW_ICON_SIZES = [
  { label: "size-4 (תפריט)", className: "size-4" },
  { label: "size-7 (⋮)", className: "size-7" },
  { label: "size-8", className: "size-8" },
] as const;

export { PREVIEW_ICON_SIZES };
