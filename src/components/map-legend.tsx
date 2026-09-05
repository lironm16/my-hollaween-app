"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

function SwatchPin({
  scare,
  candy,
  hours,
  closed,
  onBreak,
  bare,
  multi,
}: {
  scare?: "mild" | "medium" | "spicy";
  candy?: "plenty" | "low" | "out";
  hours?: "closing" | "opening";
  closed?: boolean;
  onBreak?: boolean;
  bare?: boolean;
  multi?: boolean;
}) {
  return (
    <div
      className={cn(
        "house-pin is-legend relative",
        hours === "closing" && "is-closing-soon",
        hours === "opening" && "is-opening-soon",
        bare && "is-undecorated",
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
        <span className="pin-houses">
          <i />
          <i />
        </span>
      ) : null}
      {closed ? <b className="pin-status is-closed" /> : null}
      {onBreak ? <b className="pin-status is-break" /> : null}
      {candy ? <b className={`pin-status is-${candy}`} /> : null}
    </div>
  );
}

const ROWS: { key: string; label: string; node: ReactNode }[] = [
  { key: "mild", label: "לילדים", node: <SwatchPin scare="mild" /> },
  { key: "medium", label: "קצת מפחיד", node: <SwatchPin scare="medium" /> },
  { key: "spicy", label: "מפחיד", node: <SwatchPin scare="spicy" /> },
  { key: "bare", label: "לא מקושט", node: <SwatchPin bare /> },
  { key: "plenty", label: "יש ממתקים", node: <SwatchPin scare="mild" candy="plenty" /> },
  { key: "low", label: "מעט ממתקים", node: <SwatchPin scare="mild" candy="low" /> },
  { key: "out", label: "נגמרו הממתקים", node: <SwatchPin scare="mild" candy="out" /> },
  { key: "closed", label: "סגור", node: <SwatchPin scare="mild" closed /> },
  { key: "break", label: "הפסקה", node: <SwatchPin scare="mild" onBreak /> },
  { key: "close", label: "נסגר בקרוב", node: <SwatchPin scare="mild" hours="closing" /> },
  { key: "open", label: "נפתח בקרוב", node: <SwatchPin scare="mild" hours="opening" /> },
  { key: "multi", label: "כמה דירות", node: <SwatchPin multi /> },
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
                className="map-legend-panel relative max-h-[min(88dvh,40rem)] w-[min(38rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-2xl bg-[#160b20] px-3 pb-3 pt-12 text-right shadow-[0_16px_48px_rgba(0,0,0,0.55)] ring-1 ring-orange-500/30"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="absolute top-2 left-2 inline-flex size-9 items-center justify-center rounded-full text-violet-200 hover:bg-orange-500/15 hover:text-orange-100"
                  aria-label="סגירת המקרא"
                  onClick={() => setOpen(false)}
                >
                  <X className="size-5" />
                </button>
                <h2 id={titleId} className="absolute top-3 right-4 text-sm font-semibold text-orange-100">
                  מקרא
                </h2>
                <ul className="grid grid-cols-2 gap-x-3 gap-y-3">
                  {ROWS.map((row) => (
                    <li key={row.key} className="flex min-h-14 items-center gap-2">
                      <div className="grid size-14 shrink-0 place-items-center overflow-visible" dir="ltr">
                        {row.node}
                      </div>
                      <span className="text-sm leading-snug text-violet-100">{row.label}</span>
                    </li>
                  ))}
                </ul>
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
