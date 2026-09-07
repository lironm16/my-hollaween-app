"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Clock, Home, MapPin, Route, Users, WifiOff, X } from "lucide-react";
import { formatDistance } from "@/lib/geo";
import type { WalkingRoute } from "@/lib/route";

function Row({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <li className="flex items-center gap-3 text-base text-violet-100">
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-200">
        {icon}
      </span>
      <span>{label}</span>
    </li>
  );
}

export function MapStats({
  houseCount,
  onlineDevices = null,
  route = null,
  staleLabel = null,
}: {
  houseCount: number;
  onlineDevices?: number | null;
  route?: WalkingRoute | null;
  staleLabel?: string | null;
}) {
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
                className="relative w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl bg-[#160b20] text-right shadow-[0_16px_48px_rgba(0,0,0,0.55)] ring-1 ring-orange-500/30"
                onClick={() => setOpen(false)}
              >
                <div className="flex items-center justify-between gap-2 px-3 pt-2 pb-1">
                  <h2 id={titleId} className="text-base font-semibold text-orange-100">
                    סיכום
                  </h2>
                  <button
                    type="button"
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-violet-200 hover:bg-orange-500/15 hover:text-orange-100"
                    aria-label="סגירת הסיכום"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpen(false);
                    }}
                  >
                    <X className="size-5" />
                  </button>
                </div>
                <div className="px-3 pb-3">
                  <ul className="flex flex-col gap-2.5">
                    <Row icon={<Home className="size-4" />} label={`${houseCount} בתים`} />
                    {onlineDevices != null ? (
                      <Row icon={<Users className="size-4" />} label={`${onlineDevices} מבקרים`} />
                    ) : null}
                  </ul>
                  {route ? (
                    <section className="mt-3 border-t border-orange-500/20 pt-3">
                      <h3 className="mb-2 text-base font-semibold text-orange-200">
                        {route.accessible ? "מסלול נגיש" : "מסלול"}
                      </h3>
                      <ul className="flex flex-col gap-2.5">
                        <Row icon={<MapPin className="size-4" />} label={`${route.stops.length} עצירות`} />
                        <Row icon={<Route className="size-4" />} label={formatDistance(route.totalMeters)} />
                        <Row icon={<Clock className="size-4" />} label={`כ־${route.totalMinutes} דק׳`} />
                      </ul>
                    </section>
                  ) : null}
                  {staleLabel ? (
                    <p className="mt-3 flex items-center gap-2 border-t border-orange-500/20 pt-3 text-base text-amber-100">
                      <WifiOff className="size-4 shrink-0" />
                      {staleLabel}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
      <button
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-full bg-[#1d1028] text-orange-100 shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-1 ring-orange-500/35 hover:bg-orange-500/10"
        aria-label="סיכום המפה"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title="סיכום"
        onClick={() => setOpen((value) => !value)}
      >
        <Home className="size-5" />
      </button>
    </div>
  );
}
