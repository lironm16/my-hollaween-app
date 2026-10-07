"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import { OverlayCloseBar } from "@/components/overlay-close-button";
import { SkipIcon } from "@/components/skip-icon";
import { POI_PIN_FACE_SRC } from "@/lib/pin-faces";
import { PIN_BACKGROUND } from "@/lib/pin-colors";
import { GEM_MAP_LEGEND_OPEN_HE, GEM_MAP_LEGEND_SECTION_HE } from "@/lib/gem-hunt-copy";
import {
  PIN_SCHOOL_CAMPUS_INK_SRC,
  PIN_SCHOOL_CAMPUS_INK_SRC_2X,
} from "@/lib/map-pin-school-icon";
import { PRACTICE_PIN_BAT_SRC } from "@/lib/practice-pin-face";
import { cn } from "@/lib/utils";

function SwatchPin({
  scare,
  poi,
  candy,
  hours,
  closed,
  onBreak,
  bare,
  multi,
  school,
  practice,
  visited,
  skipped,
  gemRing,
}: {
  scare?: "mild" | "medium" | "spicy";
  poi?: boolean;
  candy?: "plenty" | "low" | "out";
  hours?: "closing" | "opening";
  closed?: boolean;
  onBreak?: boolean;
  bare?: boolean;
  multi?: boolean;
  school?: boolean;
  practice?: boolean;
  visited?: boolean;
  skipped?: boolean;
  gemRing?: "sparkle" | "diamond";
}) {
  const scareLevel = scare ?? "mild";
  const scareSrc = poi ? POI_PIN_FACE_SRC : `/icons/pin-scare-${scareLevel}.png`;
  return (
    <div
      className={cn(
        "house-pin is-legend relative",
        poi && "is-poi",
        multi && "is-building",
        school && "is-school-campus is-school-list-pin",
        practice && "is-practice",
        !gemRing && hours === "closing" && "is-closing-soon",
        !gemRing && hours === "opening" && "is-opening-soon",
        gemRing === "sparkle" && "is-gem-ring-sparkle",
        gemRing === "diamond" && "is-gem-ring-diamond",
        bare && "is-undecorated",
        visited && "is-visited",
      )}
      style={{
        background: school || practice
          ? practice
            ? "linear-gradient(165deg,#0f766e 0%,#0d9488 55%,#14b8a6 100%)"
            : undefined
          : bare
            ? poi
              ? PIN_BACKGROUND.poi.undecorated
              : PIN_BACKGROUND.house.undecorated
            : poi
              ? PIN_BACKGROUND.poi.decorated
              : PIN_BACKGROUND.house.decorated,
      }}
      aria-hidden
    >
      {gemRing ? (
        <>
          <i className={`pin-gem-ring is-${gemRing}`} aria-hidden />
          {gemRing === "sparkle" ? (
            <span className="pin-gem-sparkles" aria-hidden>
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
          ) : null}
        </>
      ) : null}
      {!gemRing && hours === "closing" ? <i className="pin-hours-ring is-closing" /> : null}
      {!gemRing && hours === "opening" ? <i className="pin-hours-ring is-opening" /> : null}
      {practice ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="pin-practice-bat-img" src={PRACTICE_PIN_BAT_SRC} alt="" aria-hidden />
      ) : null}
      {!practice && (scare || bare) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="pin-scare" src={scareSrc} alt="" />
      ) : null}
      {multi ? (
        <span className="pin-cluster-icon" aria-hidden>
          <svg viewBox="0 0 32 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="12" width="13" height="15" rx="1.5" fill="#ffedd5" />
            <path d="M1 12 L7.5 5.5 L14 12 Z" fill="#ffedd5" />
            <rect x="14" y="8" width="13" height="19" rx="1.5" fill="#fb923c" />
            <path d="M14 8 L20.5 1.5 L27 8 Z" fill="#fb923c" />
          </svg>
        </span>
      ) : null}
      {school ? (
        <span className="pin-school-art" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="pin-school-castle-img is-ink"
            src={PIN_SCHOOL_CAMPUS_INK_SRC}
            srcSet={`${PIN_SCHOOL_CAMPUS_INK_SRC} 1x, ${PIN_SCHOOL_CAMPUS_INK_SRC_2X} 2x`}
            alt=""
            width={68}
            height={56}
            decoding="async"
          />
        </span>
      ) : null}
      {skipped ? (
        <b className="pin-status is-skipped" aria-hidden>
          <SkipIcon className="pin-skip-icon" />
        </b>
      ) : null}
      {!skipped && closed ? <b className="pin-status is-closed" /> : null}
      {!skipped && onBreak ? <b className="pin-status is-break" /> : null}
      {!skipped && candy ? <b className={`pin-status is-${candy}`} /> : null}
    </div>
  );
}

const BASE_GROUPS: { title: string; items: { key: string; label: string; node: ReactNode }[] }[] = [
  {
    title: "סוג המקום",
    items: [
      { key: "house-kind", label: "בית", node: <SwatchPin scare="mild" /> },
      { key: "poi-kind", label: "נקודת עניין", node: <SwatchPin scare="mild" poi /> },
      { key: "building-kind", label: "בניין", node: <SwatchPin multi /> },
      { key: "school-kind", label: "בית ספר", node: <SwatchPin school /> },
      { key: "practice-kind", label: "בית תרגול", node: <SwatchPin practice /> },
    ],
  },
  {
    title: "ממתקים",
    items: [
      { key: "plenty", label: "יש", node: <SwatchPin scare="mild" candy="plenty" /> },
      { key: "low", label: "מעט", node: <SwatchPin scare="mild" candy="low" /> },
      { key: "out", label: "נגמר", node: <SwatchPin scare="mild" candy="out" /> },
    ],
  },
  {
    title: "קישוט",
    items: [
      { key: "bare", label: "ללא", node: <SwatchPin bare /> },
      { key: "mild", label: "לילדים", node: <SwatchPin scare="mild" /> },
      { key: "medium", label: "קצת מפחיד", node: <SwatchPin scare="medium" /> },
      { key: "spicy", label: "מפחיד", node: <SwatchPin scare="spicy" /> },
    ],
  },
  {
    title: "בית",
    items: [
      { key: "closed", label: "סגור", node: <SwatchPin scare="mild" closed /> },
      { key: "break", label: "הפסקה", node: <SwatchPin scare="mild" onBreak /> },
      { key: "close", label: "נסגר בקרוב", node: <SwatchPin scare="mild" hours="closing" /> },
      { key: "open", label: "נפתח בקרוב", node: <SwatchPin scare="mild" hours="opening" /> },
      { key: "visited", label: "ביקרתי", node: <SwatchPin scare="mild" visited /> },
      { key: "skipped", label: "דילגתי", node: <SwatchPin scare="mild" skipped /> },
    ],
  },
];

const GEM_LEGEND_GROUP = {
  title: GEM_MAP_LEGEND_SECTION_HE,
  items: [
    {
      key: "gem-open",
      label: GEM_MAP_LEGEND_OPEN_HE,
      node: <SwatchPin scare="mild" gemRing="sparkle" />,
    },
  ],
} as const;

export function MapLegend({ showGemLegend = false }: { showGemLegend?: boolean }) {
  const groups = showGemLegend ? [...BASE_GROUPS, GEM_LEGEND_GROUP] : BASE_GROUPS;
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const panelId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative">
      {mounted && open
        ? createPortal(
            <div
              className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 p-3"
              onClick={() => setOpen(false)}
            >
              <div
                id={panelId}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                dir="rtl"
                className="map-legend-panel relative flex max-h-[min(88dvh,40rem)] w-[min(38rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl bg-[#160b20] text-right shadow-[0_16px_48px_rgba(0,0,0,0.55)] ring-1 ring-orange-500/30"
                onClick={(event) => event.stopPropagation()}
              >
                <OverlayCloseBar
                  compact
                  onClose={() => setOpen(false)}
                  label="סגירת המקרא"
                  title={
                    <span id={titleId} className="text-base font-semibold text-orange-100">
                      מקרא
                    </span>
                  }
                  className="border-b border-orange-500/15 px-3 pb-2"
                />
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
                  <div className="flex flex-col gap-3">
                    {groups.map((group) => (
                      <section key={group.title}>
                        <h3 className="mb-1.5 text-base font-semibold text-orange-200">{group.title}</h3>
                        <ul className="flex flex-wrap justify-start gap-x-1 gap-y-2">
                          {group.items.map((item) => (
                            <li key={item.key} className="flex w-[4.75rem] min-w-0 flex-col items-center gap-1">
                              <div className="grid size-16 shrink-0 place-items-center overflow-visible" dir="ltr">
                                {item.node}
                              </div>
                              <span className="w-full text-center text-base leading-tight text-violet-100">
                                {item.label}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
      <button
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-full bg-[#1d1028] text-orange-100 shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-1 ring-orange-500/35 hover:bg-orange-500/10"
        aria-label="מקרא המפה"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title="מקרא"
        onClick={() => setOpen((value) => !value)}
      >
        <Info className="size-5" />
      </button>
    </div>
  );
}
