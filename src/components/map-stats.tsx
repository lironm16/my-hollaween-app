"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { WifiOff, X } from "lucide-react";
import { ScarePumpkin } from "@/components/scare-glyphs";
import type { WalkingRoute } from "@/lib/route";
import { cn } from "@/lib/utils";

function HouseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-full text-orange-500">
      <path
        fill="currentColor"
        d="M3.6 11.2 12 3.6l8.4 7.6v8.6c0 .8-.7 1.5-1.5 1.5h-4.4v-5.8H9.5v5.8H5.1c-.8 0-1.5-.7-1.5-1.5z"
      />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-full">
      <path
        fill="#f97316"
        d="M12 2.4c3.6 0 6.4 2.7 6.4 6.1 0 4.6-6.4 12.2-6.4 12.2S5.6 13.1 5.6 8.5C5.6 5.1 8.4 2.4 12 2.4z"
      />
      <circle cx="12" cy="8.6" r="2.9" fill="#fff7ed" />
    </svg>
  );
}

function PathIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-full">
      <path
        d="M4.6 15.2c3.2-1.4 3.4-5.4 7-7 2.8-1.2 4.6 1.2 8 0.4"
        fill="none"
        stroke="#fb923c"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="4.6" cy="15.4" r="2.3" fill="#c4b5fd" />
      <circle cx="19.7" cy="8.4" r="2.3" fill="#c4b5fd" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-full">
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

function IconWell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center [&_svg]:block [&_svg]:size-full",
        className,
      )}
    >
      {children}
    </span>
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
    <div className="flex min-h-14 min-w-0 items-center gap-1.5 rounded-xl bg-[#14081c] px-2 py-2">
      <IconWell className="size-9">{icon}</IconWell>
      <span className="flex min-w-0 flex-col justify-center text-right">
        <span className="text-lg font-bold leading-none text-white">{value}</span>
        <span className="mt-0.5 text-base leading-none text-white/80">{label}</span>
      </span>
    </div>
  );
}

function CompactChip({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex min-h-10 min-w-0 items-center gap-1.5 rounded-xl bg-[#14081c] px-2 py-1.5">
      <IconWell className="size-7">{icon}</IconWell>
      <span className="shrink-0 text-base font-bold leading-none text-white">{value}</span>
      <span className="min-w-0 truncate text-base leading-none text-white/80">{label}</span>
    </div>
  );
}

export function StatsSummary({
  filteredHouses,
  route = null,
  staleLabel = null,
  heading = false,
  compact = false,
}: {
  filteredHouses: number;
  route?: WalkingRoute | null;
  staleLabel?: string | null;
  heading?: boolean;
  compact?: boolean;
}) {
  const walk = route ? distanceParts(route.totalMeters) : null;
  const houseIcon = <HouseIcon />;
  const routeTitle = route?.accessible ? "מסלול נגיש" : "מסלול";

  if (compact) {
    return (
      <div className="flex min-w-0 w-full flex-col gap-1.5 text-right" dir="rtl">
        <section className="min-w-0 rounded-2xl bg-[#2c1a12] p-1.5 ring-1 ring-orange-500/25">
          <h3 className="mb-1 text-right text-base font-semibold text-orange-400">{routeTitle}</h3>
          <div className="grid min-w-0 grid-cols-2 gap-1.5">
            <CompactChip icon={houseIcon} value={String(filteredHouses)} label="בתים" />
            <CompactChip
              icon={<PinIcon />}
              value={route ? String(route.stops.length) : "—"}
              label="עצירות"
            />
            <CompactChip
              icon={<PathIcon />}
              value={walk ? walk.value : "—"}
              label={walk ? walk.unit : "ק״מ"}
            />
            <CompactChip
              icon={<ClockIcon />}
              value={route ? `כ־${route.totalMinutes}` : "—"}
              label="דק׳"
            />
          </div>
        </section>
        {staleLabel ? (
          <p className="flex items-center gap-2 text-base text-amber-100">
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
      <section className="rounded-2xl bg-[#2c1a12] p-2.5 ring-1 ring-orange-500/25">
        <h3 className="mb-2 text-right text-base font-semibold text-orange-400">{routeTitle}:</h3>
        <div className="grid grid-cols-2 gap-2">
          <RouteChip icon={houseIcon} value={String(filteredHouses)} label="בתים" />
          <RouteChip
            icon={<PinIcon />}
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
      </section>
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
  filteredHouses: number;
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
        <span className="inline-flex size-6 items-center justify-center text-orange-400">
          <HouseIcon />
        </span>
        <span className="absolute -top-1 -right-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-orange-500 px-1 text-sm font-bold leading-none text-black">
          {badge}
        </span>
      </button>
    </div>
  );
}
