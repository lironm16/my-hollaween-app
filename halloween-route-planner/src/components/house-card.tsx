"use client";

import Image from "next/image";
import {
  CalendarClock,
  CandyCane,
  CheckSquare,
  MapPin,
  Share2,
  Sparkles,
  Timer,
} from "lucide-react";
import type { ReactNode } from "react";
import { House } from "@/lib/types";
import {
  cn,
  formatTimeRange,
  isHouseOpenNow,
  nextOpeningTime,
} from "@/lib/utils";
import { format } from "date-fns";
import he from "date-fns/locale/he";

const candyLabels: Record<string, string> = {
  green: "שפע סוכריות",
  yellow: "מתמעט",
  red: "נגמר כרגע",
};

const statusLabels: Record<House["status"], string> = {
  active: "פעיל",
  paused: "בהפסקה",
  suspended: "בהשהיית מנהל",
};

const scareLabel: Record<string, string> = {
  low: "רגוע",
  medium: "בינוני",
  high: "מפחיד",
};

function candyClass(level: string) {
  switch (level) {
    case "green":
      return "from-emerald-400/40 to-emerald-500/80 text-emerald-100";
    case "yellow":
      return "from-amber-300/40 to-amber-400/80 text-amber-100";
    case "red":
      return "from-rose-400/40 to-rose-500/80 text-rose-100";
    default:
      return "from-white/10 to-white/5 text-slate-200";
  }
}

type HouseCardProps = {
  house: House;
  onAddToRoute?: (house: House) => void;
  onNavigate?: (house: House) => void;
  onCheckIn?: (house: House) => void;
};

export function HouseCard({
  house,
  onAddToRoute,
  onNavigate,
  onCheckIn,
}: HouseCardProps) {
  const openNow = isHouseOpenNow(house);
  const nextOpen = nextOpeningTime(house);

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_10px_40px_rgba(51,34,98,0.35)] transition-transform hover:-translate-y-1">
      <div className="relative h-48 overflow-hidden">
        <Image
          src={
            house.imageUrl && !house.defaultImage
              ? house.imageUrl
              : "/haunted-house-placeholder.svg"
          }
          alt={house.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width:768px) 100vw, (max-width:1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium shadow-lg backdrop-blur-sm",
              house.status === "active"
                ? "bg-emerald-500/20 text-emerald-200"
                : house.status === "paused"
                ? "bg-amber-500/20 text-amber-100"
                : "bg-rose-500/20 text-rose-100",
            )}
          >
            {statusLabels[house.status]}
          </span>
          <span
            className={cn(
              "flex items-center gap-1 rounded-full bg-gradient-to-l px-3 py-1 text-xs font-medium backdrop-blur-sm",
              candyClass(house.candyLevel),
            )}
          >
            <CandyCane className="h-3.5 w-3.5" />
            {candyLabels[house.candyLevel]}
          </span>
        </div>
        <div className="absolute bottom-4 right-4 flex items-center gap-2 text-xs text-white/85">
          <span className="rounded-full bg-black/40 px-3 py-1 backdrop-blur-sm">
            {scareLabel[house.scareLevel]} מפחיד
          </span>
          {house.decorationVotes > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-black/40 px-3 py-1 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-200" />
              קישוטים נבחרים · {house.decorationVotes}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <header className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">{house.title}</h2>
            <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-slate-200">
              {house.checkIns.toLocaleString("he-IL")} צ&apos;ק-אין
            </span>
          </div>
          <p className="text-sm leading-relaxed text-slate-200/90">
            {house.description}
          </p>
        </header>

        <div className="space-y-2 text-sm text-slate-200/80">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-sky-300" />
            <span>
              {house.address}, {house.city}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-emerald-300" />
            {openNow ? (
              <span className="text-emerald-200">פתוח עכשיו</span>
            ) : nextOpen ? (
              <span>
                נפתח שוב{" "}
                {format(nextOpen, "EEEE ב-HH:mm", { locale: he })}
              </span>
            ) : (
              <span>לא פתוח היום</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CalendarClock className="h-4 w-4 text-purple-300" />
            {house.hours.map((slot) => (
              <span
                key={`${slot.day}-${slot.start}`}
                className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-200/85"
              >
                {formatTimeRange(slot.start, slot.end)}
              </span>
            ))}
          </div>
          <div className="flex items-start gap-2 text-xs text-slate-300/90">
            <CheckSquare className="mt-0.5 h-4 w-4 text-pink-300" />
            <span>{house.contactInstructions ?? "הנחיות נשלחות בהמשך."}</span>
          </div>
        </div>

        <footer className="mt-auto flex flex-wrap items-center gap-2">
          <Button onClick={() => onAddToRoute?.(house)}>הוספה למסלול</Button>
          <GhostButton onClick={() => onNavigate?.(house)}>
            ניווט
          </GhostButton>
          <GhostButton onClick={() => onCheckIn?.(house)}>
            סימון ביקור
          </GhostButton>
          <GhostButton className="ml-auto" onClick={() => onAddToRoute?.(house)}>
            <Share2 className="h-4 w-4" />
            שיתוף
          </GhostButton>
        </footer>
      </div>
    </article>
  );
}

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
};

function Button({ children, onClick }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-full bg-gradient-to-l from-[var(--color-accent)] to-[var(--color-accent-strong)] px-4 py-2 text-sm font-medium text-black shadow-lg transition-transform hover:-translate-y-0.5"
    >
      {children}
    </button>
  );
}

function GhostButton({
  children,
  onClick,
  className,
}: ButtonProps & { className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 transition-transform hover:-translate-y-0.5",
        className,
      )}
    >
      {children}
    </button>
  );
}
