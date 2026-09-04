"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

function SwatchPin({
  sprinkles,
  candy,
  hours,
  emoji = "🎃",
}: {
  sprinkles?: boolean;
  candy?: "plenty" | "low";
  hours?: "closing" | "opening";
  emoji?: string;
}) {
  return (
    <div
      className={cn("house-pin is-legend relative", hours === "closing" && "is-closing-soon", hours === "opening" && "is-opening-soon")}
      style={{ background: "#6d28d9" }}
      aria-hidden
    >
      {sprinkles ? (
        <i className="pin-sprinkles">
          <i />
          <i />
          <i />
          <i />
        </i>
      ) : null}
      {hours === "closing" ? <i className="pin-hours-ring is-closing" /> : null}
      {hours === "opening" ? <i className="pin-hours-ring is-opening" /> : null}
      <span>{emoji}</span>
      {candy ? <b className={`pin-status is-${candy}`} /> : null}
    </div>
  );
}

const ROWS: { key: string; label: string; node: ReactNode }[] = [
  { key: "decor", label: "מקושט", node: <SwatchPin sprinkles /> },
  { key: "plenty", label: "יש ממתקים", node: <SwatchPin candy="plenty" /> },
  { key: "low", label: "מעט ממתקים", node: <SwatchPin candy="low" /> },
  {
    key: "none",
    label: "בלי ממתקים — אין נקודה",
    node: <SwatchPin />,
  },
  { key: "close", label: "נסגר בקרוב", node: <SwatchPin hours="closing" /> },
  { key: "open", label: "נפתח בקרוב", node: <SwatchPin hours="opening" emoji="👻" /> },
  {
    key: "multi",
    label: "כמה דירות — הקשה מציגה כל דירה",
    node: (
      <div className="house-pin is-legend is-building relative" style={{ background: "#6d28d9" }} aria-hidden>
        <span>🎃</span>
        <span className="pin-apt-dots">
          <i className="pin-apt-dot is-plenty" />
          <i className="pin-apt-dot is-low" />
        </span>
      </div>
    ),
  },
];

export function MapLegend() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative" dir="rtl">
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="מקרא המפה"
          className="map-legend-panel absolute end-0 bottom-[calc(100%+0.5rem)] w-[min(17.5rem,calc(100vw-1.5rem))] rounded-2xl bg-[#160b20]/95 p-3 text-right shadow-[0_12px_32px_rgba(0,0,0,0.5)] ring-1 ring-orange-500/30 backdrop-blur-md"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-orange-100">מקרא</h2>
            <button
              type="button"
              className="inline-flex size-7 items-center justify-center rounded-full text-violet-200 hover:bg-orange-500/15 hover:text-orange-100"
              aria-label="סגירת המקרא"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </button>
          </div>
          <ul className="space-y-2">
            {ROWS.map((row) => (
              <li key={row.key} className="flex items-center gap-2.5">
                <div className="grid size-9 shrink-0 place-items-center">{row.node}</div>
                <span className="text-[13px] leading-snug text-violet-100">{row.label}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
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
