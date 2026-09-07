"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, Clock, Home, MapPin, Route, Users, WifiOff, X } from "lucide-react";
import { formatDistance } from "@/lib/geo";
import type { WalkingRoute } from "@/lib/route";
import { cn } from "@/lib/utils";

function Tile({
  icon,
  iconClass,
  value,
  label,
}: {
  icon: ReactNode;
  iconClass: string;
  value: string;
  label: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1 px-1">
      <span
        className={cn(
          "inline-flex size-14 items-center justify-center rounded-full text-white shadow-sm",
          iconClass,
        )}
      >
        {icon}
      </span>
      <span className="text-base font-semibold leading-tight text-orange-100">{value}</span>
      <span className="text-center text-base leading-tight text-violet-300">{label}</span>
    </div>
  );
}

function Card({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl bg-[#12081a] p-3 ring-1 ring-orange-500/20", className)}>
      <h3 className="mb-2 text-right text-base font-semibold text-orange-200">{title}</h3>
      <div className="flex items-start justify-center gap-2">{children}</div>
    </section>
  );
}

export function MapStats({
  totalHouses,
  filteredHouses,
  onlineDevices = null,
  likedCount,
  visitedCount,
  route = null,
  staleLabel = null,
}: {
  totalHouses: number;
  filteredHouses: number;
  onlineDevices?: number | null;
  likedCount: number;
  visitedCount: number;
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

  const badge = filteredHouses > 99 ? "99+" : String(filteredHouses);

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
                className="relative w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl bg-[#160b20] text-right shadow-[0_16px_48px_rgba(0,0,0,0.55)] ring-1 ring-orange-500/30"
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
                <div className="flex flex-col gap-2 px-3 pb-3">
                  <Card title="השכונה">
                    <Tile
                      icon={<Home className="size-7" />}
                      iconClass="bg-orange-500"
                      value={String(totalHouses)}
                      label="בתים"
                    />
                    <Tile
                      icon={<Users className="size-7" />}
                      iconClass="bg-cyan-500"
                      value={onlineDevices == null ? "—" : String(onlineDevices)}
                      label="מבקרים"
                    />
                  </Card>
                  <div className="grid grid-cols-2 gap-2">
                    <Card title="לפי הסינון">
                      <Tile
                        icon={<Home className="size-7" />}
                        iconClass="bg-violet-600"
                        value={String(filteredHouses)}
                        label="בתים"
                      />
                    </Card>
                    <Card title="שלכם">
                      <Tile
                        icon={
                          <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
                            <path
                              fill="currentColor"
                              d="M12 20.6 4.7 13.4C2.4 11.1 2.6 7.4 5.5 5.6c2.1-1.3 4.8-.7 6.5 1.4 1.7-2.1 4.4-2.7 6.5-1.4 2.9 1.8 3.1 5.5.8 7.8z"
                            />
                          </svg>
                        }
                        iconClass="bg-rose-600"
                        value={String(likedCount)}
                        label="שמורים"
                      />
                      <Tile
                        icon={<Check className="size-7" strokeWidth={3} />}
                        iconClass="bg-emerald-600"
                        value={String(visitedCount)}
                        label="ביקרתי"
                      />
                    </Card>
                  </div>
                  {route ? (
                    <Card
                      title={route.accessible ? "מסלול נגיש" : "מסלול"}
                      className="bg-orange-950/50 ring-orange-400/35"
                    >
                      <Tile
                        icon={<MapPin className="size-7" />}
                        iconClass="bg-orange-500"
                        value={String(route.stops.length)}
                        label="עצירות"
                      />
                      <Tile
                        icon={<Route className="size-7" />}
                        iconClass="bg-amber-400 text-black"
                        value={formatDistance(route.totalMeters)}
                        label="מרחק"
                      />
                      <Tile
                        icon={<Clock className="size-7" />}
                        iconClass="bg-sky-500"
                        value={`${route.totalMinutes}`}
                        label="דק׳"
                      />
                    </Card>
                  ) : null}
                  {staleLabel ? (
                    <p className="flex items-center gap-2 text-base text-amber-100">
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
        className="relative inline-flex size-11 items-center justify-center rounded-full bg-[#1d1028] text-orange-100 shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-1 ring-orange-500/35 hover:bg-orange-500/10"
        aria-label={`סיכום המפה · ${filteredHouses} בתים בסינון`}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title="סיכום"
        onClick={() => setOpen((value) => !value)}
      >
        <Home className="size-5" />
        <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-xs font-bold leading-none text-black">
          {badge}
        </span>
      </button>
    </div>
  );
}
