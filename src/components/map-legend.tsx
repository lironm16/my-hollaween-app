"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import { OverlayCloseBar } from "@/components/overlay-close-button";
import { cn } from "@/lib/utils";

function SwatchPin({
  scare,
  candy,
  hours,
  closed,
  onBreak,
  bare,
  multi,
  visited,
}: {
  scare?: "mild" | "medium" | "spicy";
  candy?: "plenty" | "low" | "out";
  hours?: "closing" | "opening";
  closed?: boolean;
  onBreak?: boolean;
  bare?: boolean;
  multi?: boolean;
  visited?: boolean;
}) {
  return (
    <div
      className={cn(
        "house-pin is-legend relative",
        hours === "closing" && "is-closing-soon",
        hours === "opening" && "is-opening-soon",
        bare && "is-undecorated",
        visited && "is-visited",
      )}
      style={{ background: bare ? "#94a3b8" : "#6d28d9" }}
      aria-hidden
    >
      {hours === "closing" ? <i className="pin-hours-ring is-closing" /> : null}
      {hours === "opening" ? <i className="pin-hours-ring is-opening" /> : null}
      {scare || bare ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="pin-scare" src={`/icons/pin-scare-${scare ?? "mild"}.png`} alt="" />
      ) : null}
      {multi ? (
        <>
          <span className="pin-houses">
            <i />
            <i />
          </span>
          <span className="pin-apt-dots" aria-hidden>
            <i className="pin-apt-dot is-plenty" />
            <i className="pin-apt-dot is-low" />
            <i className="pin-apt-dot is-out" />
          </span>
        </>
      ) : null}
      {closed ? <b className="pin-status is-closed" /> : null}
      {onBreak ? <b className="pin-status is-break" /> : null}
      {candy ? <b className={`pin-status is-${candy}`} /> : null}
    </div>
  );
}

const GROUPS: { title: string; items: { key: string; label: string; node: ReactNode }[] }[] = [
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
      { key: "multi", label: "כמה בתים", node: <SwatchPin multi /> },
      { key: "visited", label: "ביקרתי", node: <SwatchPin scare="mild" visited /> },
    ],
  },
];

export function MapLegend() {
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
                onClick={() => setOpen(false)}
              >
                <OverlayCloseBar
                  onClose={() => setOpen(false)}
                  label="סגירת המקרא"
                  className="px-3 pb-1"
                />
                <h2 id={titleId} className="shrink-0 px-3 pb-1 text-base font-semibold text-orange-100">
                  מקרא
                </h2>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
                  <div className="flex flex-col gap-3">
                    {GROUPS.map((group) => (
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
