"use client";

import { Bell, List, MapPinned, Menu, Route, SlidersHorizontal, X } from "lucide-react";
import { BrandTitle } from "@/components/brand-title";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";

/** Recommended countdown target — matches most house openings & add-house cutoff. */
export const COUNTDOWN_TARGET = {
  hour: 17,
  minute: 0,
  labelHe: "17:00 · 31 באוקטובר",
  rationaleHe:
    "רוב הבתים נפתחים ב־17:00. בתים שפותחים מוקדם יותר (16:00, 16:30) יופיעו כ«נפתח בקרוב» בלילה עצמו — הספירה מסמנת תחילת הערב בשכונה.",
} as const;

function PhoneFrame({
  label,
  caption,
  children,
  width = 300,
}: {
  label: string;
  caption?: string;
  children: React.ReactNode;
  width?: number;
}) {
  return (
    <figure className="space-y-2">
      <figcaption className="text-center text-sm font-medium text-orange-200">{label}</figcaption>
      {caption ? <p className="text-center text-xs text-violet-400">{caption}</p> : null}
      <div
        className="mx-auto overflow-hidden rounded-[2rem] bg-[#0a0610] p-2 shadow-[0_24px_70px_rgba(0,0,0,0.6)] ring-1 ring-orange-500/30"
        style={{ width: `min(100%, ${width}px)` }}
      >
        <div className="@container overflow-hidden rounded-[1.5rem] bg-[#14091c]">{children}</div>
      </div>
    </figure>
  );
}

function MockStatusBar() {
  return (
    <div className="flex items-center justify-between px-4 py-1 text-[10px] tabular-nums text-violet-300/80" dir="ltr">
      <span>19:34</span>
      <span>5G · 73%</span>
    </div>
  );
}

function MockHeader() {
  return (
    <header className="border-b border-orange-500/20 bg-[#14091c]/95 px-3 pb-2 pt-1">
      <MockStatusBar />
      <div className="flex items-start justify-between gap-2" dir="ltr">
        <div className="flex gap-1.5 pt-1">
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25">
            <Menu className="size-4" />
          </span>
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25">
            <Bell className="size-4" />
          </span>
        </div>
        <div className="min-w-0 flex-1 text-right" dir="rtl">
          <BrandTitle />
          <p className="mt-0.5 truncate text-right text-xs text-violet-200/75">{config.neighborhood}</p>
        </div>
      </div>
    </header>
  );
}

/** Top countdown bar — one line, Creepster, scales down to fit narrow screens. */
function CountdownBar({
  days,
  time,
  active,
  onClick,
}: {
  days: number;
  time: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${days} days, ${time} until Halloween night`}
      className={cn(
        "flex w-full min-w-0 items-center justify-center border-b px-2 py-2 transition-colors",
        active
          ? "border-orange-500/40 bg-orange-950/40"
          : "border-orange-500/20 bg-[#12081a]/90 hover:bg-orange-950/25",
      )}
      dir="ltr"
    >
      <span
        className="countdown-bar-text whitespace-nowrap font-creepster max-w-full text-center tabular-nums tracking-wide text-orange-400 [text-shadow:0_0_10px_rgba(251,146,60,0.35)]"
        style={{ fontSize: "clamp(0.72rem, 5cqi, 1.35rem)" }}
      >
        {days} Days · {time}
      </span>
    </button>
  );
}

function FloatingToolbar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "absolute left-3 right-3 z-20 flex items-center justify-between gap-2 rounded-2xl bg-[#160b1f]/92 px-2 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.45)] ring-1 ring-orange-500/30 backdrop-blur-md",
        className,
      )}
    >
      <div className="flex shrink-0 rounded-xl bg-[#261536] p-0.5 ring-1 ring-orange-400/35">
        <span className="inline-flex size-9 items-center justify-center rounded-lg bg-orange-500 text-black">
          <MapPinned className="size-4" />
        </span>
        <span className="inline-flex size-9 items-center justify-center rounded-lg text-violet-200">
          <List className="size-4" />
        </span>
      </div>
      <span className="inline-flex size-9 items-center justify-center rounded-lg bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25">
        <SlidersHorizontal className="size-4" />
      </span>
      <span className="inline-flex size-9 items-center justify-center rounded-lg bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25">
        <MapPinned className="size-4" />
      </span>
      <span className="inline-flex size-9 items-center justify-center rounded-lg bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25">
        <Route className="size-4" />
      </span>
    </div>
  );
}

function MockMap({ tall }: { tall?: boolean }) {
  return (
    <div className={cn("relative bg-[#1a2433]", tall ? "h-[420px]" : "h-52")}>
      <div className="absolute inset-0 bg-[linear-gradient(160deg,#243044_0%,#1a2433_45%,#2a3548_100%)]" />
      <div className="absolute left-[22%] top-[38%] size-3.5 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(251,146,60,0.7)] ring-2 ring-black/30" />
      <div className="absolute left-[48%] top-[52%] size-3.5 rounded-full bg-violet-400 ring-2 ring-black/30" />
      <div className="absolute left-[68%] top-[30%] size-3.5 rounded-full bg-orange-400 ring-2 ring-black/30" />
      <div className="absolute left-[55%] top-[68%] size-3.5 rounded-full bg-amber-400 ring-2 ring-black/30" />
      <FloatingToolbar className="bottom-4" />
    </div>
  );
}

function LanternArt() {
  return (
    <div className="relative mx-auto mt-5 h-32 w-full max-w-[240px] overflow-hidden rounded-2xl bg-[#0a0610] ring-1 ring-orange-500/25">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,146,60,0.4),transparent_72%)]" />
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-4">
        {["🐱", "🏠", "🦇"].map((icon) => (
          <div
            key={icon}
            className="flex size-14 items-center justify-center rounded-xl bg-orange-500 shadow-[0_0_24px_rgba(251,146,60,0.65)]"
          >
            <span className="text-xl grayscale contrast-200 brightness-50">{icon}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FullScreenCountdown({
  days,
  time,
  welcome,
}: {
  days: number;
  time: string;
  welcome?: boolean;
}) {
  return (
    <div className="relative flex min-h-[520px] flex-col bg-[#0a0610]">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="size-8" />
        <span className="font-display text-sm text-orange-200">ספירה לאחור</span>
        <button type="button" className="inline-flex size-8 items-center justify-center rounded-lg text-violet-300">
          <X className="size-5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-8 pt-2">
        {welcome ? (
          <div className="mb-6 w-full max-w-[260px] rounded-2xl bg-[#160b1f]/80 px-4 py-3 ring-1 ring-orange-500/25">
            <p className="text-center font-display text-xl text-orange-200">ברוכים הבאים!</p>
            <p className="mt-2 text-center text-sm leading-relaxed text-violet-200">
              עוד {days} ימים לליל האלווין בשכונה. הוסיפו את הבית, תכננו מסלול — ונתראה בערב.
            </p>
          </div>
        ) : null}

        <p className="font-creepster text-6xl tabular-nums tracking-wide text-orange-400 [text-shadow:0_0_22px_rgba(251,146,60,0.55)]" dir="ltr">
          {days} Days
        </p>
        <p className="mt-2 font-creepster text-4xl tabular-nums tracking-[0.2em] text-orange-400/95" dir="ltr">
          {time}
        </p>
        <p className="mt-3 text-center text-sm text-violet-300">
          עד {COUNTDOWN_TARGET.labelHe}
        </p>
        <p className="mt-1 text-center text-xs text-violet-400/75">תחילת הערב בשכונה</p>

        <LanternArt />

        <p className="mt-5 text-center text-xs text-violet-500/80">
          {welcome ? "סגירה — חוזרים למפה" : "לחיצה על השורה למעלה פותחת שוב"}
        </p>
      </div>
    </div>
  );
}

function MapHomeScreen({ highlightBar }: { highlightBar?: boolean }) {
  return (
    <>
      <MockHeader />
      <CountdownBar days={91} time="07:22:32" active={highlightBar} />
      <MockMap tall />
    </>
  );
}

export function CountdownDesignV2() {
  return (
    <div className="space-y-10">
      <section className="space-y-3 rounded-2xl bg-gradient-to-br from-orange-950/40 to-[#1d1028]/80 p-4 ring-1 ring-orange-500/25">
        <h2 className="font-display text-xl text-orange-200">לאיזו שעה לספור?</h2>
        <p className="text-sm leading-relaxed text-violet-200">
          בתים נפתחים בזמנים שונים — 16:00, 17:00, 18:00 ומעלה. הספירה צריכה נקודת ייחוס אחת לכל
          השכונה.
        </p>
        <div className="rounded-xl bg-[#14091c] p-3 ring-1 ring-orange-500/20">
          <p className="font-medium text-orange-300">המלצה: 17:00 · 31 באוקטובר</p>
          <p className="mt-2 text-sm leading-relaxed text-violet-300">{COUNTDOWN_TARGET.rationaleHe}</p>
        </div>
        <div className="grid gap-2 text-xs sm:grid-cols-3">
          {[
            { time: "00:00", note: "חצות — פשוט, אבל רחוק מהערב האמיתי", tone: "text-violet-400" },
            { time: "16:00", note: "מוקדם — מתאים אם רוב הבתים ב־16:00", tone: "text-violet-400" },
            { time: "17:00", note: "✓ רוב הבתים · חיתוך הוספה · תחילת ערב", tone: "text-orange-300 font-medium" },
          ].map((row) => (
            <div key={row.time} className="rounded-lg bg-[#0a0610]/60 px-2.5 py-2 ring-1 ring-orange-500/10">
              <p className={row.tone} dir="ltr">{row.time}</p>
              <p className="mt-1 text-violet-400/90">{row.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl bg-[#1d1028]/60 p-4 ring-1 ring-orange-500/15">
        <div>
          <h2 className="font-display text-lg text-orange-200">1 · פתיחה ראשונה — מסך מלא</h2>
          <p className="mt-1 text-sm text-violet-300">
            בכניסה הראשונה לאפליקציה: מסך מלא עם ברכה + ספירה (תמיד עם שניות). סגירה → מפה.
          </p>
        </div>
        <div className="flex justify-center">
          <PhoneFrame label="First open" caption="Full screen · welcome + countdown">
            <FullScreenCountdown days={91} time="07:22:32" welcome />
          </PhoneFrame>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl bg-[#1d1028]/60 p-4 ring-1 ring-orange-500/15">
        <div>
          <h2 className="font-display text-lg text-orange-200">2 · אחרי סגירה — מפה + שורת ספירה</h2>
          <p className="mt-1 text-sm text-violet-300">
            במקום סרגל הכלים הקבוע — שורת ספירה קבועה (תמיד עם שניות). סרגל הפעולות צף על המפה.
          </p>
        </div>
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:justify-center sm:gap-6">
          <PhoneFrame label="Home map" caption="One line · no icon · no extra text">
            <MapHomeScreen highlightBar />
          </PhoneFrame>
          <PhoneFrame label="Narrow screen" caption="Font scales down to fit" width={260}>
            <MapHomeScreen highlightBar />
          </PhoneFrame>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl bg-[#1d1028]/60 p-4 ring-1 ring-orange-500/15">
        <div>
          <h2 className="font-display text-lg text-orange-200">3 · לחיצה על השורה — מסך מלא שוב</h2>
          <p className="mt-1 text-sm text-violet-300">
            השורה למעלה לחיצה — אותו מסך מלא (בלי ברכה). סגירה → חזרה למפה.
          </p>
        </div>
        <div className="flex justify-center">
          <PhoneFrame label="Tap countdown bar" caption="Reopens full screen">
            <FullScreenCountdown days={91} time="07:22:32" />
          </PhoneFrame>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl bg-[#1d1028]/60 p-4 ring-1 ring-orange-500/15">
        <h2 className="font-display text-lg text-orange-200">זרימה</h2>
        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max items-center gap-2 text-xs" dir="ltr">
            {[
              "First open",
              "Full screen + welcome",
              "Close",
              "Map + bar",
              "Tap bar",
              "Full screen",
            ].map((step, i, arr) => (
              <div key={step} className="flex items-center gap-2">
                <span className="rounded-full bg-orange-500/15 px-3 py-1.5 text-orange-200 ring-1 ring-orange-500/30">
                  {step}
                </span>
                {i < arr.length - 1 ? <span className="text-violet-500">→</span> : null}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
