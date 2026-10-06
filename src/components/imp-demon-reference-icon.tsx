import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Geometry from user reference (circle + curved horns + inner ring). viewBox 0 0 24 24 */

const HEAD = { cx: 12, cy: 13.65, r: 6.05, rInner: 4.75 } as const;

const LEFT_HORN =
  "M8.35 10.85 C6.45 8.35 5.35 5.75 5.85 4.25 C6.35 2.95 7.55 2.85 8.45 4.35 C9.15 5.55 9.35 7.85 8.35 10.85 Z";

const RIGHT_HORN =
  "M15.65 10.85 C17.55 8.35 18.65 5.75 18.15 4.25 C17.65 2.95 16.45 2.85 15.55 4.35 C14.85 5.55 14.65 7.85 15.65 10.85 Z";

const LEFT_HORN_SEAM = "M7.55 9.55 C8.05 8.35 8.25 7.05 8.15 5.95";
const RIGHT_HORN_SEAM = "M16.45 9.55 C15.95 8.35 15.75 7.05 15.85 5.95";

const strokeOutline = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.35,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** «גרסת קווי» — double ring + horn outlines (menu inactive). */
export function ImpDemonReferenceOutline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden xmlns="http://www.w3.org/2000/svg">
      <circle cx={HEAD.cx} cy={HEAD.cy} r={HEAD.r} {...strokeOutline} />
      <circle cx={HEAD.cx} cy={HEAD.cy} r={HEAD.rInner} {...strokeOutline} />
      <path d={LEFT_HORN} {...strokeOutline} />
      <path d={RIGHT_HORN} {...strokeOutline} />
      <path d={LEFT_HORN_SEAM} {...strokeOutline} strokeWidth={1.15} />
      <path d={RIGHT_HORN_SEAM} {...strokeOutline} strokeWidth={1.15} />
    </svg>
  );
}

/** «גרסת מילוי» — amber body, cream ring lines (found / reference). */
export function ImpDemonReferenceFilled({ className }: { className?: string }) {
  const ring = "#fff7ed";
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden xmlns="http://www.w3.org/2000/svg">
      <path d={LEFT_HORN} fill="currentColor" stroke={ring} strokeWidth={1.15} strokeLinejoin="round" />
      <path d={RIGHT_HORN} fill="currentColor" stroke={ring} strokeWidth={1.15} strokeLinejoin="round" />
      <circle
        cx={HEAD.cx}
        cy={HEAD.cy}
        r={HEAD.r}
        fill="currentColor"
        stroke={ring}
        strokeWidth={1.2}
      />
      <circle cx={HEAD.cx} cy={HEAD.cy} r={HEAD.rInner} fill="none" stroke={ring} strokeWidth={1.05} />
      <path d={LEFT_HORN_SEAM} fill="none" stroke={ring} strokeWidth={0.95} strokeLinecap="round" />
      <path d={RIGHT_HORN_SEAM} fill="none" stroke={ring} strokeWidth={0.95} strokeLinecap="round" />
    </svg>
  );
}

/** Filled on dark menu — app amber. */
export function ImpDemonReferenceFilledMenu({ className }: { className?: string }) {
  return <ImpDemonReferenceFilled className={cn("text-amber-300", className)} />;
}

export type ImpDemonPreviewSpec = {
  id: string;
  title: string;
  note: string;
  render: (className?: string) => ReactNode;
};

export const IMP_DEMON_PREVIEW_SPECS: ImpDemonPreviewSpec[] = [
  {
    id: "reference-jpg",
    title: "מקור — גרסאות צבע וצורה",
    note: "הקובץ שהעלית (ייחוס).",
    render: (className) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/icons/imp-demon-reference.jpg"
        alt=""
        className={cn("h-auto w-[min(100%,11rem)] rounded-lg object-contain", className)}
        width={176}
        height={120}
      />
    ),
  },
  {
    id: "svg-outline-menu",
    title: "SVG — outline (תפריט)",
    note: "currentColor קרם על רקע כהה — כמו דילוג.",
    render: (className) => (
      <ImpDemonReferenceOutline className={cn("size-10 text-orange-100", className)} />
    ),
  },
  {
    id: "svg-filled-menu",
    title: "SVG — fill («מצאתי»)",
    note: "ענבר + קווי טבעת בהירים כמו במקור.",
    render: (className) => <ImpDemonReferenceFilledMenu className={cn("size-10", className)} />,
  },
  {
    id: "svg-outline-light",
    title: "SVG — outline על רקע בהיר",
    note: "כמו צד שמאל בקובץ המקור.",
    render: (className) => (
      <ImpDemonReferenceOutline className={cn("size-10 text-[#c4a574]", className)} />
    ),
  },
  {
    id: "svg-filled-light",
    title: "SVG — fill על רקע בהיר",
    note: "כמו צד ימין — צהוב/ענבר.",
    render: (className) => (
      <ImpDemonReferenceFilled className={cn("size-10 text-amber-400", className)} />
    ),
  },
];

export const PREVIEW_ICON_SIZES = [
  { label: "size-4 (תפריט)", className: "size-4" },
  { label: "size-7 (⋮)", className: "size-7" },
  { label: "size-8", className: "size-8" },
] as const;
