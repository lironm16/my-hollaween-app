"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, WifiOff, X } from "lucide-react";
import { ScarePumpkin } from "@/components/scare-glyphs";
import { LikedSign } from "@/components/visit-marks";
import type { WalkingRoute } from "@/lib/route";
import { cn } from "@/lib/utils";

function HouseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-full w-full">
      <path
        fill="currentColor"
        d="M4.2 11.4 12 4.2l7.8 7.2v8.1c0 .7-.6 1.3-1.3 1.3h-4.1v-5.4h-4.8v5.4H5.5c-.7 0-1.3-.6-1.3-1.3z"
      />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-full w-full">
      <circle cx="8.2" cy="7.2" r="3.1" fill="#a78bfa" />
      <path fill="#a78bfa" d="M2.4 19.6c.2-3.4 2.6-5.6 5.8-5.6s5.6 2.2 5.8 5.6z" />
      <circle cx="15.6" cy="7.4" r="3.1" fill="#f97316" />
      <path fill="#f97316" d="M10.2 19.6c.3-3.2 2.6-5.2 5.4-5.2 3 0 5.4 2.1 5.6 5.2z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-full w-full">
      <path
        fill="currentColor"
        d="M12 2.4c3.7 0 6.6 2.8 6.6 6.4 0 4.6-6.6 12.8-6.6 12.8S5.4 13.4 5.4 8.8C5.4 5.2 8.3 2.4 12 2.4z"
      />
      <circle cx="12" cy="8.6" r="2.2" fill="#1c0e24" />
    </svg>
  );
}

function PathIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-full w-full">
      <path
        d="M5 17.5c2.8-1.2 3.2-4.8 6.2-6.2 2.6-1.2 4.2.8 7.4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="5" cy="18" r="2.1" fill="#a78bfa" />
      <circle cx="19" cy="11.2" r="2.1" fill="#a78bfa" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-full w-full">
      <circle cx="12" cy="12" r="8.2" fill="currentColor" />
      <circle cx="12" cy="12" r="6.4" fill="#1c0e24" />
      <path
        d="M12 7.4v5l3.2 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function distanceParts(meters: number) {
  if (meters < 1000) return { value: String(Math.round(meters)), unit: "מ׳" };
  return { value: (meters / 1000).toFixed(1), unit: "ק״מ" };
}

function Stat({
  icon,
  value,
  label,
  compact = false,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", compact ? "flex-1" : "flex-1 justify-center")}>
      <span className={cn("shrink-0", compact ? "size-10" : "size-14")}>{icon}</span>
      <span className="min-w-0 text-right">
        <span className={cn("block font-bold leading-none text-orange-50", compact ? "text-xl" : "text-2xl")}>
          {value}
        </span>
        <span className="mt-0.5 block text-base leading-tight text-violet-200">{label}</span>
      </span>
    </div>
  );
}

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl bg-[#2a1638] p-3 ring-1 ring-orange-500/20", className)}>
      <h3 className="mb-2.5 text-right text-base font-semibold text-orange-200">{title}:</h3>
      {children}
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
  const walk = route ? distanceParts(route.totalMeters) : null;

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
                className="relative w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl bg-[#160b20] text-right shadow-[0_16px_48px_rgba(0,0,0,0.55)] ring-1 ring-orange-500/35"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-1">
                  <h2
                    id={titleId}
                    className="flex items-center gap-2 text-lg font-semibold text-orange-100"
                  >
                    <span className="inline-flex size-7 text-orange-500">
                      <ScarePumpkin />
                    </span>
                    סיכום
                  </h2>
                  <button
                    type="button"
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[#2a1638] text-violet-200 ring-1 ring-orange-500/25 hover:bg-orange-500/15 hover:text-orange-100"
                    aria-label="סגירת הסיכום"
                    onClick={() => setOpen(false)}
                  >
                    <X className="size-5" />
                  </button>
                </div>
                <div className="flex flex-col gap-2.5 px-3 pb-3 pt-1">
                  <Panel title="השכונה">
                    <div className="flex items-center gap-3">
                      <Stat
                        icon={
                          <span className="text-orange-500">
                            <HouseIcon />
                          </span>
                        }
                        value={String(totalHouses)}
                        label="בתים"
                      />
                      <Stat
                        icon={<PeopleIcon />}
                        value={onlineDevices == null ? "—" : String(onlineDevices)}
                        label="מבקרים"
                      />
                    </div>
                  </Panel>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Panel title="לפי הסינון">
                      <Stat
                        icon={
                          <span className="text-orange-500">
                            <ScarePumpkin />
                          </span>
                        }
                        value={String(filteredHouses)}
                        label="בתים"
                      />
                    </Panel>
                    <Panel title="שלכם">
                      <div className="flex items-center gap-2">
                        <Stat
                          compact
                          icon={<LikedSign className="size-10" />}
                          value={String(likedCount)}
                          label="שמורים"
                        />
                        <Stat
                          compact
                          icon={
                            <span className="inline-flex size-10 items-center justify-center rounded-full bg-emerald-600 text-white">
                              <Check className="size-5" strokeWidth={3} />
                            </span>
                          }
                          value={String(visitedCount)}
                          label="ביקרתי"
                        />
                      </div>
                    </Panel>
                  </div>
                  {route && walk ? (
                    <Panel
                      title={route.accessible ? "מסלול נגיש" : "מסלול"}
                      className="bg-[#3a2010] ring-orange-400/40"
                    >
                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col items-center gap-1 rounded-xl bg-[#160b20]/70 px-1 py-2">
                          <span className="size-9 text-orange-500">
                            <PinIcon />
                          </span>
                          <span className="text-lg font-bold leading-none text-orange-50">{route.stops.length}</span>
                          <span className="text-base text-violet-200">עצירות</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 rounded-xl bg-[#160b20]/70 px-1 py-2">
                          <span className="size-9 text-orange-400">
                            <PathIcon />
                          </span>
                          <span className="text-lg font-bold leading-none text-orange-50">{walk.value}</span>
                          <span className="text-base text-violet-200">{walk.unit}</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 rounded-xl bg-[#160b20]/70 px-1 py-2">
                          <span className="size-9 text-violet-400">
                            <ClockIcon />
                          </span>
                          <span className="text-lg font-bold leading-none text-orange-50">כ־{route.totalMinutes}</span>
                          <span className="text-base text-violet-200">דק׳</span>
                        </div>
                      </div>
                    </Panel>
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
        <span className="size-6 text-orange-400">
          <HouseIcon />
        </span>
        <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-xs font-bold leading-none text-black">
          {badge}
        </span>
      </button>
    </div>
  );
}
