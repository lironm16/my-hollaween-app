import Link from "next/link";
import {
  HOURS_SOON_BADGE_OPTIONS,
  HoursSoonLegendPair,
  HoursSoonPinDemo,
} from "@/components/hours-soon-pin-preview";
import { PreviewNav } from "@/components/preview-nav";
import { config } from "@/lib/config";

export default function HoursBadgesPreviewPage() {
  return (
    <div className="min-h-dvh bg-[#140a1c] px-4 py-6 text-orange-50" dir="rtl">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="space-y-3">
          <p className="text-base text-violet-300">{config.brandEn} · תצוגת שעות</p>
          <h1 className="text-2xl font-semibold text-orange-100">תגים במקום טבעות מהבהבות</h1>
          <p className="text-base text-violet-200">
            השוואה בין העיצוב הנוכחי (עיגול כתום/טורקיז) לכמה רעיונות ל<strong className="font-medium text-orange-100">תג</strong>{" "}
            על סיכת המפה. אחרי שתבחרו אות — נחיל את הגרסה במפה, במקרא ובדף{" "}
            <Link href="/preview/hours" className="text-orange-300 underline-offset-2 hover:underline">
              שעות
            </Link>
            .
          </p>
          <PreviewNav current="/preview/hours-badges" />
        </header>

        <section className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20">
          <h2 className="text-base font-medium text-orange-100">כמו במקרא (סיכה + כיתוב)</h2>
          <p className="text-base text-violet-200">
            שתי האפשרויות זה לצד זה — כמו בצילום ששלחת. בחרו גרסה למטה וגללו לראות אותה גם בהקשר מלא.
          </p>
          <HoursSoonLegendPair variant="ring-current" />
        </section>

        {HOURS_SOON_BADGE_OPTIONS.filter((o) => o.id !== "ring-current").map((option) => (
          <section
            key={option.id}
            id={option.id}
            className="space-y-4 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20"
          >
            <div className="space-y-1">
              <h2 className="text-base font-medium text-orange-100">{option.title}</h2>
              <p className="text-base text-violet-200">{option.blurb}</p>
            </div>
            <HoursSoonLegendPair variant={option.id} />
            <div className="space-y-2 border-t border-orange-500/15 pt-4">
              <p className="text-base font-medium text-violet-300">עם נקודת ממתקים (מפה אמיתית)</p>
              <div className="flex flex-wrap items-end gap-6">
                <HoursSoonPinDemo kind="opening" variant={option.id} />
                <HoursSoonPinDemo kind="closing" variant={option.id} />
              </div>
            </div>
            {option.id === "top-pill" || option.id === "ribbon" ? (
              <div className="space-y-2 border-t border-orange-500/15 pt-4">
                <p className="text-base font-medium text-violet-300">סיכה קטנה (אחרי הקשה על בניין)</p>
                <div className="flex flex-wrap items-end gap-6">
                  <HoursSoonPinDemo kind="opening" variant={option.id} size="dot" />
                  <HoursSoonPinDemo kind="closing" variant={option.id} size="dot" />
                </div>
              </div>
            ) : null}
          </section>
        ))}

        <p className="text-base text-violet-400">
          כתבו באיזה אות (א–ו) אתם הולכים — או שילוב (למשל «ד במפה, טקסט מלא בכרטיס בלבד»).
        </p>
      </div>
    </div>
  );
}
