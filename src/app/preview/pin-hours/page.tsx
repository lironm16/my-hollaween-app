import type { ReactNode } from "react";
import Link from "next/link";
import { PinHoursTimeLabel } from "@/components/pin-hours-time-label";
import { PreviewNav } from "@/components/preview-nav";
import { config } from "@/lib/config";

function PinFace() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="pin-scare" src="/icons/pin-scare-mild.png" alt="" />
  );
}

function LegacyAuraPin({
  kind,
  candy,
}: {
  kind: "closing" | "opening";
  candy?: "plenty" | "low";
}) {
  return (
    <div
      className={`house-pin is-legend relative ${kind === "closing" ? "is-closing-soon" : "is-opening-soon"}`}
      style={{ background: "#6d28d9" }}
      aria-hidden
    >
      <i className={`pin-hours-ring is-${kind === "closing" ? "closing" : "opening"}`} />
      {candy ? <b className={`pin-status is-${candy}`} /> : null}
      <PinFace />
    </div>
  );
}

function TimeLabelPin({
  kind,
  time,
  candy,
}: {
  kind: "closing" | "opening";
  time: string;
  candy?: "plenty" | "low";
}) {
  return (
    <div
      className={`house-pin-lane has-hours-time ${kind === "closing" ? "is-closing-soon" : "is-opening-soon"}`}
      aria-hidden
    >
      <div className="house-pin is-legend relative" style={{ background: "#6d28d9" }}>
        {candy ? <b className={`pin-status is-${candy}`} /> : null}
        <PinFace />
      </div>
      <PinHoursTimeLabel kind={kind} time={time} />
    </div>
  );
}

function PinRow({
  title,
  note,
  legacy,
  next,
}: {
  title: string;
  note: string;
  legacy: ReactNode;
  next: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20">
      <div className="space-y-1">
        <h2 className="text-base font-medium text-orange-100">{title}</h2>
        <p className="text-base text-violet-300">{note}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 rounded-xl bg-[#140a1c]/70 p-3 ring-1 ring-orange-500/10">
          <p className="text-base font-medium text-violet-200">לפני — עיגול מהבהב</p>
          <div className="flex min-h-20 items-center justify-center" dir="ltr">{legacy}</div>
        </div>
        <div className="space-y-2 rounded-xl bg-[#140a1c]/70 p-3 ring-1 ring-orange-500/10">
          <p className="text-base font-medium text-orange-200">אחרי — תווית שעה</p>
          <div className="flex min-h-20 items-center justify-center" dir="ltr">{next}</div>
        </div>
      </div>
    </section>
  );
}

export default function PinHoursPreviewPage() {
  return (
    <div className="min-h-dvh bg-[#140a1c] px-4 py-6 text-orange-50" dir="rtl">
      <div className="mx-auto max-w-2xl space-y-5">
        <header className="space-y-3">
          <p className="text-base text-violet-300">{config.brandEn} · תווית שעה על המפה</p>
          <h1 className="text-2xl font-semibold text-orange-100">שעת פתיחה / סגירה ליד הסיכה</h1>
          <p className="text-base text-violet-200">
            במקום עיגול כתום או טורקיז שנמוג סביב הסיכה, מציגים תווית קומפקטית עם השעה בפועל.
            כתום = נסגר בקרוב, טורקיז = נפתח בקרוב. על המפה החיה:{" "}
            <Link href="/?rehearsal=open" className="text-orange-300 underline-offset-2 hover:underline">
              /?rehearsal=open
            </Link>
            .
          </p>
          <PreviewNav current="/preview/pin-hours" />
        </header>

        <PinRow
          title="נסגר בקרוב"
          note="בחצי השעה האחרונה של חלון פתיחה — השעה היא שעת הסגירה."
          legacy={<LegacyAuraPin kind="closing" />}
          next={<TimeLabelPin kind="closing" time="21:00" />}
        />

        <PinRow
          title="נפתח בקרוב"
          note="בחצי השעה שלפני חלון פתיחה — השעה היא שעת הפתיחה."
          legacy={<LegacyAuraPin kind="opening" />}
          next={<TimeLabelPin kind="opening" time="20:00" />}
        />

        <PinRow
          title="עם סטטוס ממתקים"
          note="תווית השעה יושבת ליד הסיכה; נקודת הממתקים נשארת בפינה."
          legacy={<LegacyAuraPin kind="closing" candy="plenty" />}
          next={<TimeLabelPin kind="closing" time="18:00" candy="plenty" />}
        />

        <section className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20">
          <h2 className="text-base font-medium text-orange-100">מפתח צבעים</h2>
          <ul className="space-y-2 text-base text-violet-200">
            <li className="flex items-center gap-2">
              <PinHoursTimeLabel kind="closing" time="21:00" />
              <span>כתום — הבית נסגר בשעה המוצגת</span>
            </li>
            <li className="flex items-center gap-2">
              <PinHoursTimeLabel kind="opening" time="20:00" />
              <span>טורקיז — הבית נפתח בשעה המוצגת</span>
            </li>
          </ul>
          <p className="text-base text-violet-300">
            בכרטיס הבית נשאר באנר מלא («נסגר בקרוב ב־…» / «נפתח בקרוב ב־…»). על המפה רק השעה — פחות רעש, יותר מידע.
          </p>
        </section>
      </div>
    </div>
  );
}
