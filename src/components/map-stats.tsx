"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Heart, WifiOff, X } from "lucide-react";
import { ScarePumpkin } from "@/components/scare-glyphs";
import { VisitedCheck } from "@/components/visited-check";
import type { WalkingRoute } from "@/lib/route";
import { cn } from "@/lib/utils";

function HouseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-full w-full">
      <path
        fill="currentColor"
        d="M3.6 11.2 12 3.6l8.4 7.6v8.6c0 .8-.7 1.5-1.5 1.5h-4.4v-5.8H9.5v5.8H5.1c-.8 0-1.5-.7-1.5-1.5z"
      />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-full w-full">
      <circle cx="8" cy="7" r="3.2" fill="#c4b5fd" />
      <path fill="#c4b5fd" d="M1.8 20c.3-3.6 2.8-6 6.2-6s5.9 2.4 6.2 6z" />
      <circle cx="15.8" cy="7.2" r="3.2" fill="#fb923c" />
      <path fill="#fb923c" d="M9.8 20c.3-3.4 2.8-5.6 5.8-5.6 3.2 0 5.8 2.3 6 5.6z" />
    </svg>
  );
}

function PinIcon({ mark }: { mark?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-full w-full">
      <path
        fill="#f97316"
        d="M12 1.8c4 0 7.2 3 7.2 6.8 0 5.2-7.2 13.6-7.2 13.6S4.8 13.8 4.8 8.6C4.8 4.8 8 1.8 12 1.8z"
      />
      <circle cx="12" cy="8.5" r="3.2" fill="#fff7ed" />
      {mark ? (
        <text
          x="12"
          y="10.2"
          textAnchor="middle"
          fill="#9a3412"
          fontSize="5.2"
          fontWeight="700"
        >
          {mark}
        </text>
      ) : (
        <circle cx="12" cy="8.5" r="1.4" fill="#9a3412" />
      )}
    </svg>
  );
}

function PathIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-full w-full">
      <path
        d="M4.5 18c3.2-1.4 3.4-5.4 7-7 2.8-1.2 4.6 1.2 8 0.4"
        fill="none"
        stroke="#fb923c"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="4.5" cy="18.2" r="2.3" fill="#c4b5fd" />
      <circle cx="19.6" cy="11.2" r="2.3" fill="#c4b5fd" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-full w-full">
      <circle cx="12" cy="12" r="8.6" fill="#c4b5fd" />
      <circle cx="12" cy="12" r="6.6" fill="#1c0e24" />
      <path
        d="M12 7.2v5.1l3.4 2.1"
        fill="none"
        stroke="#fb923c"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function distanceParts(meters: number) {
  if (meters < 1000) return { value: String(Math.round(meters)), unit: "מ׳" };
  return { value: (meters / 1000).toFixed(1), unit: "ק״מ" };
}

function Tile({
  icon,
  value,
  label,
  className,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5 rounded-xl bg-[#14081c] px-2.5 py-2.5", className)}>
      <span className="size-12 shrink-0">{icon}</span>
      <span className="min-w-0 text-right">
        <span className="block text-2xl font-bold leading-none text-white">{value}</span>
        <span className="mt-1 block text-base leading-none text-white/80">{label}</span>
      </span>
    </div>
  );
}

function RouteChip({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 rounded-xl bg-[#14081c] px-1.5 py-2">
      <span className="size-9 shrink-0">{icon}</span>
      <span className="min-w-0 text-right">
        <span className="block text-lg font-bold leading-none text-white">{value}</span>
        <span className="mt-0.5 block text-base leading-none text-white/80">{label}</span>
      </span>
    </div>
  );
}

function Stack({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
      <span className="size-9">{icon}</span>
      <span className="text-xl font-bold leading-none text-white">{value}</span>
      <span className="text-base leading-none text-white/80">{label}</span>
    </div>
  );
}

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl bg-[#241332] p-2.5 ring-1 ring-white/10", className)}>
      <h3 className="mb-2 text-right text-base font-semibold text-orange-400">{title}:</h3>
      {children}
    </section>
  );
}

function SavedHeart({ className }: { className?: string }) {
  return (
    <Heart className={cn("fill-current text-[#fb7185]", className)} strokeWidth={2.2} />
  );
}

function CompactCell({
  icon,
  value,
  label,
  ariaLabel,
}: {
  icon: ReactNode;
  value: string;
  label?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      className="flex min-w-0 max-w-full flex-col items-center gap-0.5 overflow-hidden rounded-xl bg-[#14081c] px-0.5 py-1"
      aria-label={ariaLabel ?? (label ? `${value} ${label}` : value)}
    >
      <span className="size-5 shrink-0">{icon}</span>
      <span className="max-w-full truncate text-sm font-bold leading-none text-white">{value}</span>
      {label ? (
        <span className="max-w-full truncate text-[10px] leading-none text-white/80">{label}</span>
      ) : null}
    </div>
  );
}

export function StatsSummary({
  totalHouses,
  filteredHouses,
  onlineDevices = null,
  likedCount,
  visitedCount,
  route = null,
  staleLabel = null,
  heading = false,
  compact = false,
}: {
  totalHouses: number;
  filteredHouses: number;
  onlineDevices?: number | null;
  likedCount: number;
  visitedCount: number;
  route?: WalkingRoute | null;
  staleLabel?: string | null;
  heading?: boolean;
  compact?: boolean;
}) {
  const walk = route ? distanceParts(route.totalMeters) : null;
  const stopMark = route && route.stops.length < 100 ? String(route.stops.length) : undefined;
  const houseIcon = (
    <span className="text-orange-500">
      <HouseIcon />
    </span>
  );

  if (compact) {
    return (
      <div className="flex min-w-0 w-full flex-col gap-1.5 overflow-hidden text-right" dir="rtl">
        <div className="grid min-w-0 grid-cols-4 gap-1 rounded-2xl bg-[#241332] p-1 ring-1 ring-white/10">
          <CompactCell icon={houseIcon} value={String(totalHouses)} label="בתים" />
          <CompactCell
            icon={<PeopleIcon />}
            value={onlineDevices == null ? "—" : String(onlineDevices)}
            label="מבקרים"
          />
          <CompactCell
            icon={<SavedHeart className="size-5" />}
            value={String(likedCount)}
            ariaLabel={`${likedCount} שמורים`}
          />
          <CompactCell
            icon={<VisitedCheck visited size="sm" />}
            value={String(visitedCount)}
            ariaLabel={`${visitedCount} ביקרתי`}
          />
        </div>
        <section className="min-w-0 rounded-2xl bg-[#2c1a12] p-1 ring-1 ring-orange-500/25">
          <h3 className="mb-1 truncate text-right text-xs font-semibold text-orange-400">
            {route?.accessible ? "מסלול נגיש" : "מסלול"}
          </h3>
          <div className="grid min-w-0 grid-cols-4 gap-1">
            <CompactCell icon={houseIcon} value={String(filteredHouses)} label="בתים" />
            <CompactCell
              icon={<PinIcon mark={stopMark} />}
              value={route ? String(route.stops.length) : "—"}
              label="עצירות"
            />
            <CompactCell
              icon={<PathIcon />}
              value={walk ? walk.value : "—"}
              label={walk ? walk.unit : "ק״מ"}
            />
            <CompactCell
              icon={<ClockIcon />}
              value={route ? String(route.totalMinutes) : "—"}
              label="דק׳"
            />
          </div>
        </section>
        {staleLabel ? (
          <p className="flex items-center gap-2 text-sm text-amber-100">
            <WifiOff className="size-4 shrink-0" />
            {staleLabel}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 text-right" dir="rtl">
      {heading ? (
        <p className="flex items-center gap-1.5 text-xl font-bold text-orange-400">
          <span className="inline-flex size-7 text-orange-500">
            <ScarePumpkin />
          </span>
          סיכום
        </p>
      ) : null}
      <Section title="השכונה">
        <div className="grid grid-cols-2 gap-2">
          <Tile icon={houseIcon} value={String(totalHouses)} label="בתים" />
          <Tile
            icon={<PeopleIcon />}
            value={onlineDevices == null ? "—" : String(onlineDevices)}
            label="מבקרים"
          />
        </div>
      </Section>
      <Section title="שלכם">
        <div className="flex items-start justify-around gap-1 pt-1">
          <Stack icon={<SavedHeart className="size-9" />} value={String(likedCount)} label="שמורים" />
          <Stack icon={<VisitedCheck visited />} value={String(visitedCount)} label="ביקרתי" />
        </div>
      </Section>
      <Section
        title={route?.accessible ? "מסלול נגיש" : "מסלול"}
        className="bg-[#2c1a12] ring-orange-500/25"
      >
        <div className="grid grid-cols-2 gap-2">
          <RouteChip icon={houseIcon} value={String(filteredHouses)} label="בתים" />
          <RouteChip
            icon={<PinIcon mark={stopMark} />}
            value={route ? String(route.stops.length) : "—"}
            label="עצירות"
          />
          <RouteChip icon={<PathIcon />} value={walk ? walk.value : "—"} label={walk ? walk.unit : "ק״מ"} />
          <RouteChip
            icon={<ClockIcon />}
            value={route ? `כ־${route.totalMinutes}` : "—"}
            label="דק׳"
          />
        </div>
      </Section>
      {staleLabel ? (
        <p className="flex items-center gap-2 text-base text-amber-100">
          <WifiOff className="size-4 shrink-0" />
          {staleLabel}
        </p>
      ) : null}
    </div>
  );
}

export function MapStats(props: {
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
  const badge = props.filteredHouses > 99 ? "99+" : String(props.filteredHouses);

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
                className="relative w-[min(24rem,calc(100vw-1.5rem))] rounded-3xl bg-[#12081a] p-3 text-right shadow-[0_16px_48px_rgba(0,0,0,0.55)] ring-1 ring-orange-500/40"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2
                    id={titleId}
                    className="flex items-center gap-1.5 text-xl font-bold text-orange-400"
                  >
                    <span className="inline-flex size-7 text-orange-500">
                      <ScarePumpkin />
                    </span>
                    סיכום
                  </h2>
                  <button
                    type="button"
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-black hover:bg-orange-400"
                    aria-label="סגירת הסיכום"
                    onClick={() => setOpen(false)}
                  >
                    <X className="size-5" strokeWidth={3} />
                  </button>
                </div>
                <StatsSummary {...props} />
              </div>
            </div>,
            document.body,
          )
        : null}
      <button
        type="button"
        className="relative inline-flex size-11 items-center justify-center rounded-full bg-[#1d1028] text-orange-100 shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-1 ring-orange-500/35 hover:bg-orange-500/10"
        aria-label={`סיכום המפה · ${props.filteredHouses} בתים בסינון`}
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
