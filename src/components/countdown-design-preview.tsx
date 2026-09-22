"use client";

import { Bell, ChevronLeft, Clock, List, MapPinned, Menu, Route, X } from "lucide-react";
import { BrandTitle } from "@/components/brand-title";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";

type CountdownMode =
  | "chip-far"
  | "chip-mid"
  | "chip-near"
  | "marquee-rotate"
  | "banner"
  | "sheet"
  | "welcome"
  | "tonight"
  | "after";

const MODES: {
  id: CountdownMode;
  title: string;
  when: string;
  note: string;
}[] = [
  {
    id: "chip-far",
    title: "שבב בכותרת — רחוק",
    when: "יותר מ־30 יום",
    note: "ימים בלבד. ללא שניות. לחיצה פותחת את הגיליון המלא.",
  },
  {
    id: "chip-mid",
    title: "שבב בכותרת — מתקרבים",
    when: "7–30 יום",
    note: "ימים + שעות. עדיין קומפקטי, לא מסיח.",
  },
  {
    id: "chip-near",
    title: "שבב בכותרת — דחוף",
    when: "פחות מ־7 ימים",
    note: "ימים + שעות + דקות. הדגשה עדינה (זוהר).",
  },
  {
    id: "marquee-rotate",
    title: "סיבוב עם שמות השכונה",
    when: "כל התקופה",
    note: "השורה מתחלפת: שכונות ↔ ספירה לאחור.",
  },
  {
    id: "banner",
    title: "באנר הקשר",
    when: "14 יום אחרונים",
    note: "הודעה עם קריאה לפעולה — הוספת בית, התראות.",
  },
  {
    id: "sheet",
    title: "גיליון מלא (בלחיצה)",
    when: "בכל עת לפני האירוע",
    note: "החוויה הגדולה מהרפרנס — מספרים, אמנות, סגירה.",
  },
  {
    id: "welcome",
    title: "ברכה בפתיחה ראשונה",
    when: "התקנה / ביקור ראשון",
    note: "פעם אחת בלבד. לא בכל פתיחה.",
  },
  {
    id: "tonight",
    title: "הערב!",
    when: "31 באוקטובר",
    note: "הספירה נעלמת. סטטוס חי של בתים.",
  },
  {
    id: "after",
    title: "אחרי האירוע",
    when: "1 בנובמבר ואילך",
    note: "הספירה מוסתרת. הודעה רכה לשנה הבאה.",
  },
];

function PhoneFrame({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <figure className={cn("space-y-2", className)}>
      <figcaption className="text-center text-sm font-medium text-violet-300">{label}</figcaption>
      <div className="mx-auto w-[min(100%,280px)] overflow-hidden rounded-[2rem] bg-[#0a0610] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.55)] ring-1 ring-orange-500/25">
        <div className="overflow-hidden rounded-[1.5rem] bg-[#14091c]">{children}</div>
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

function MockHeader({
  subtitle,
  subtitleClassName,
  pulse,
}: {
  subtitle: React.ReactNode;
  subtitleClassName?: string;
  pulse?: boolean;
}) {
  return (
    <header className="border-b border-orange-500/20 bg-[#14091c]/90 px-3 pb-2 pt-1">
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
          <button
            type="button"
            className={cn(
              "mt-0.5 block w-full text-right text-sm tabular-nums transition-colors",
              pulse
                ? "animate-pulse text-orange-300 [text-shadow:0_0_12px_rgba(251,146,60,0.5)]"
                : "text-violet-200/90",
              subtitleClassName,
            )}
          >
            {subtitle}
          </button>
        </div>
      </div>
    </header>
  );
}

function MockMapBody({ dimmed }: { dimmed?: boolean }) {
  return (
    <div className={cn("relative h-36 bg-[#1a2433]", dimmed && "opacity-40")}>
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#243044_0%,#1a2433_50%,#2a3548_100%)]" />
      <div className="absolute left-[28%] top-[35%] size-3 rounded-full bg-orange-500 ring-2 ring-black/30" />
      <div className="absolute left-[52%] top-[48%] size-3 rounded-full bg-violet-400 ring-2 ring-black/30" />
      <div className="absolute left-[68%] top-[28%] size-3 rounded-full bg-orange-400 ring-2 ring-black/30" />
      <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-[#160b1f]/90 px-2 py-1.5 ring-1 ring-orange-500/20">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1">
            <span className="inline-flex size-7 items-center justify-center rounded-md bg-orange-500 text-black">
              <MapPinned className="size-3.5" />
            </span>
            <span className="inline-flex size-7 items-center justify-center rounded-md text-violet-200">
              <List className="size-3.5" />
            </span>
            <span className="inline-flex size-7 items-center justify-center rounded-md text-violet-200">
              <Route className="size-3.5" />
            </span>
          </div>
          <span className="truncate text-xs text-orange-100">12 בתים פתוחים הערב</span>
        </div>
      </div>
    </div>
  );
}

function MockBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gradient-to-r from-orange-950 via-amber-950 to-orange-950 px-3 py-2 text-center text-xs leading-snug text-amber-50 ring-1 ring-inset ring-orange-500/30">
      {children}
    </div>
  );
}

function LanternArt() {
  return (
    <div className="relative mx-auto mt-4 h-28 w-full max-w-[220px] overflow-hidden rounded-xl bg-[#0a0610] ring-1 ring-orange-500/20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,146,60,0.35),transparent_70%)]" />
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-3">
        {["🐱", "🏠", "🦇"].map((icon) => (
          <div
            key={icon}
            className="flex size-12 items-center justify-center rounded-lg bg-orange-500/90 text-lg shadow-[0_0_20px_rgba(251,146,60,0.6)]"
          >
            <span className="grayscale contrast-200 brightness-50">{icon}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CountdownSheet({ days, time, compact }: { days: number; time: string; compact?: boolean }) {
  return (
    <div className="relative bg-[#0a0610] px-4 pb-6 pt-3">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" className="text-xs text-violet-300">
          סגירה
        </button>
        <span className="font-display text-sm text-orange-200">ספירה לאחור</span>
        <span className="size-6" />
      </div>
      <div className="text-center">
        <p
          className={cn(
            "font-creepster tabular-nums tracking-wide text-orange-400 [text-shadow:0_0_18px_rgba(251,146,60,0.55)]",
            compact ? "text-4xl" : "text-5xl",
          )}
          dir="ltr"
        >
          {days} Days
        </p>
        <p
          className={cn(
            "mt-1 font-creepster tabular-nums tracking-widest text-orange-400/90",
            compact ? "text-2xl" : "text-3xl",
          )}
          dir="ltr"
        >
          {time}
        </p>
        <p className="mt-2 text-sm text-violet-300">עד {config.eventNight.labelHe} · ליל האלווין</p>
      </div>
      {!compact ? <LanternArt /> : null}
      <p className="mt-4 text-center text-xs text-violet-400/80">לחיצה בכל מקום מחוץ לגיליון — סגירה</p>
    </div>
  );
}

function WelcomeOverlay({ days }: { days: number }) {
  return (
    <div className="relative">
      <MockHeader subtitle={`${days} ימים · ${config.eventNight.labelHe}`} />
      <div className="relative">
        <MockMapBody dimmed />
        <div className="absolute inset-0 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-[240px] rounded-2xl bg-[#160b1f] p-4 ring-1 ring-orange-500/30 shadow-[0_0_40px_rgba(251,146,60,0.15)]">
            <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-orange-500/15 text-orange-300">
              <Clock className="size-5" />
            </div>
            <h3 className="text-center font-display text-lg text-orange-200">ברוכים הבאים!</h3>
            <p className="mt-2 text-center text-sm leading-relaxed text-violet-200">
              עוד <span className="font-semibold text-orange-300">{days} ימים</span> לליל האלווין בשכונה.
              הוסיפו את הבית שלכם, תכננו מסלול — ונתראה בערב.
            </p>
            <button
              type="button"
              className="mt-4 w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-black"
            >
              למפה
            </button>
            <button type="button" className="mt-2 w-full py-1 text-xs text-violet-400">
              הצג ספירה מלאה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModePreview({ mode }: { mode: CountdownMode }) {
  switch (mode) {
    case "chip-far":
      return (
        <PhoneFrame label="> 30 יום">
          <MockHeader subtitle={`91 ימים · ${config.eventNight.labelHe}`} />
          <MockMapBody />
        </PhoneFrame>
      );
    case "chip-mid":
      return (
        <PhoneFrame label="7–30 יום">
          <MockHeader subtitle={`12 ימים · 18 שעות · ${config.eventNight.labelHe}`} />
          <MockMapBody />
        </PhoneFrame>
      );
    case "chip-near":
      return (
        <PhoneFrame label="< 7 ימים">
          <MockHeader subtitle="3 ימים · 07:22" pulse subtitleClassName="text-orange-300" />
          <MockMapBody />
        </PhoneFrame>
      );
    case "marquee-rotate":
      return (
        <PhoneFrame label="סיבוב">
          <MockHeader
            subtitle={
              <span className="inline-flex w-full items-center justify-end gap-1">
                <span className="text-violet-200/70">שיכון ותיקים · חרוזים</span>
                <span className="text-orange-400/60">↔</span>
                <span className="text-orange-300">91 ימים</span>
              </span>
            }
          />
          <MockMapBody />
        </PhoneFrame>
      );
    case "banner":
      return (
        <PhoneFrame label="14 יום אחרונים">
          <MockHeader subtitle={`12 ימים · ${config.eventNight.labelHe}`} />
          <MockBanner>
            <strong className="text-orange-200">12 ימים לליל האלווין</strong>
            <br />
            הוסיפו בית עד 17:00 ב־31/10 · הפעילו התראות
          </MockBanner>
          <MockMapBody />
        </PhoneFrame>
      );
    case "sheet":
      return (
        <PhoneFrame label="גיליון מלא">
          <div className="relative">
            <MockHeader subtitle={`91 ימים · ${config.eventNight.labelHe}`} />
            <MockMapBody dimmed />
            <div className="absolute inset-x-0 bottom-0">
              <div className="h-8 bg-gradient-to-t from-black/60 to-transparent" />
              <CountdownSheet days={91} time="07:22:32" />
            </div>
          </div>
        </PhoneFrame>
      );
    case "welcome":
      return (
        <PhoneFrame label="פתיחה ראשונה">
          <WelcomeOverlay days={91} />
        </PhoneFrame>
      );
    case "tonight":
      return (
        <PhoneFrame label="31 באוקטובר">
          <MockHeader subtitle="הערב! · בתים פתוחים עכשיו" subtitleClassName="text-orange-300 font-semibold" />
          <MockBanner>
            <span className="inline-flex items-center justify-center gap-1">
              <span className="size-1.5 animate-pulse rounded-full bg-green-400" />
              18 בתים פתוחים · 4 נסגרים בקרוב
            </span>
          </MockBanner>
          <MockMapBody />
        </PhoneFrame>
      );
    case "after":
      return (
        <PhoneFrame label="אחרי האירוע">
          <MockHeader subtitle={config.neighborhood} />
          <div className="px-4 py-8 text-center">
            <p className="font-display text-xl text-orange-300/80">תודה שהייתם חלק!</p>
            <p className="mt-2 text-sm text-violet-300/70">נתראה בליל האלווין הבא 🎃</p>
            <div className="mt-6 h-24 rounded-xl bg-[#1a2433]/60 ring-1 ring-orange-500/10" />
          </div>
        </PhoneFrame>
      );
  }
}

export function CountdownDesignPreview() {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="font-display text-xl text-orange-200">עוצמה לאורך השנה</h2>
        <p className="text-sm leading-relaxed text-violet-300">
          ככל שמתקרבים ל־31 באוקטובר, הממשק נהיה דחוס יותר — אבל המפה תמיד נשארת במרכז.
        </p>
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max items-center gap-2 px-1 text-xs" dir="ltr">
            {[
              { label: ">30d", tone: "bg-[#1d1028] text-violet-200" },
              { label: "7–30d", tone: "bg-[#1d1028] text-violet-200" },
              { label: "<7d", tone: "bg-orange-950 text-orange-200 ring-1 ring-orange-500/40" },
              { label: "banner", tone: "bg-amber-950 text-amber-100 ring-1 ring-amber-500/40" },
              { label: "31 Oct", tone: "bg-orange-500 text-black font-semibold" },
              { label: "after", tone: "bg-[#1d1028] text-violet-400" },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex items-center gap-2">
                <span className={cn("rounded-full px-3 py-1.5 tabular-nums", step.tone)}>{step.label}</span>
                {i < arr.length - 1 ? <ChevronLeft className="size-4 rotate-180 text-violet-500" /> : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      {MODES.map((mode) => (
        <section
          key={mode.id}
          id={mode.id}
          className="scroll-mt-6 space-y-4 rounded-2xl bg-[#1d1028]/60 p-4 ring-1 ring-orange-500/15"
        >
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-lg text-orange-200">{mode.title}</h2>
              <span className="rounded-full bg-orange-500/15 px-2.5 py-0.5 text-xs text-orange-200 ring-1 ring-orange-500/25">
                {mode.when}
              </span>
            </div>
            <p className="text-sm text-violet-300">{mode.note}</p>
          </div>
          <div className="flex justify-center">
            <ModePreview mode={mode.id} />
          </div>
        </section>
      ))}

      <section className="space-y-4 rounded-2xl bg-[#1d1028]/60 p-4 ring-1 ring-orange-500/15">
        <h2 className="font-display text-lg text-orange-200">השוואת פורמטים — אותו רגע בזמן</h2>
        <p className="text-sm text-violet-300">91 ימים, 07:22:32 — איך זה נראה בכל מצב.</p>
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-xl bg-[#14091c] p-3 ring-1 ring-orange-500/10">
            <p className="mb-2 text-center text-xs text-violet-400">כותרת</p>
            <p className="text-center text-sm tabular-nums text-violet-200" dir="ltr">
              91 days · Oct 31
            </p>
          </div>
          <div className="rounded-xl bg-[#14091c] p-3 ring-1 ring-orange-500/10">
            <p className="mb-2 text-center text-xs text-violet-400">באנר</p>
            <p className="text-center text-xs leading-relaxed text-amber-100">
              91 days until Halloween — add your house
            </p>
          </div>
          <div className="rounded-xl bg-[#0a0610] p-3 ring-1 ring-orange-500/10">
            <p className="mb-2 text-center text-xs text-violet-400">גיליון</p>
            <CountdownSheet days={91} time="07:22:32" compact />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-orange-500/25 bg-orange-500/5 p-4">
        <div className="flex gap-3">
          <X className="mt-0.5 size-4 shrink-0 text-red-400/80" />
          <div className="space-y-1 text-sm text-violet-200">
            <p className="font-medium text-orange-200">לא מומלץ: מסך פתיחה בכל כניסה</p>
            <p className="text-violet-300">
              ספירה שחוסמת את המפה בכל פתיחה — מפריעה למי שפותח את האפליקציה לבדוק בית או מסלול.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
