import {
  ImpDemonFilledIcon,
  ImpDemonOutlineIcon,
} from "@/components/imp-demon-reference-icon";
import { PreviewNav } from "@/components/preview-nav";
import { SkipOutlineIcon } from "@/components/skip-icon";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";

function MenuRow({
  label,
  icon,
  active,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-orange-50",
        active ? "bg-[#3d262a] ring-1 ring-amber-500/30" : "bg-[#2a1838]/80 ring-1 ring-orange-500/15",
      )}
    >
      <span className="text-base font-medium">{label}</span>
      <span className="inline-flex shrink-0 items-center justify-center">{icon}</span>
    </div>
  );
}

const SIZES = [
  { label: "16px (תפריט)", className: "size-4" },
  { label: "24px", className: "size-6" },
  { label: "28px", className: "size-7" },
  { label: "32px", className: "size-8" },
  { label: "48px", className: "size-12" },
  { label: "64px", className: "size-16" },
] as const;

export default function ImpIconsPreviewPage() {
  return (
    <div className="min-h-dvh bg-[#140a1c] px-4 py-8 text-orange-50" dir="rtl">
      <div className="mx-auto max-w-3xl space-y-10">
        <header className="space-y-3">
          <p className="text-base text-violet-300">{config.brandEn} · שדון</p>
          <h1 className="text-3xl font-bold text-orange-100">גרסאות צבע וצורה — שדון</h1>
          <p className="text-base leading-relaxed text-violet-200">
            שחזור וקטורי (SVG) מדויק של האיור: מצב לא מלא (Outline) ומצב מלא (Filled).
          </p>
          <PreviewNav current="/preview/imp-icons" />
        </header>

        {/* 1. Comparison on Light Card (Matching the Reference Image) */}
        <section className="space-y-4 rounded-3xl bg-[#faf8f5] p-6 text-stone-900 shadow-xl ring-1 ring-stone-200">
          <div className="text-center">
            <h2 className="text-xl font-bold text-stone-800">העתק מדויק — תצוגה בהירה</h2>
            <p className="text-sm text-stone-500">זהה לחלוטין לכרטיס «גרסאות צבע וצורה» שהעלית</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-12 py-6" dir="ltr">
            <div className="flex flex-col items-center gap-3">
              <span className="rounded-full bg-stone-200/70 px-3 py-1 text-xs font-semibold text-stone-700">
                לא מלא (Not Full Mode)
              </span>
              <ImpDemonOutlineIcon className="size-36 text-[#d8c39d]" />
            </div>

            <div className="flex flex-col items-center gap-3">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                מלא (Full Mode)
              </span>
              <ImpDemonFilledIcon className="size-36 text-[#f5be0b]" />
            </div>
          </div>

          <p className="text-center text-sm font-medium tracking-wide text-stone-600">
            גרסאות צבע וצורה
          </p>
        </section>

        {/* 2. Side-by-Side on Dark App Background */}
        <section className="space-y-4 rounded-3xl bg-[#1d1028] p-6 ring-1 ring-orange-500/20">
          <div>
            <h2 className="text-xl font-bold text-orange-100">תצוגה על רקע האפליקציה (כהה)</h2>
            <p className="text-sm text-violet-300">
              צבעי הממשק: קרם למצב לא מלא, צהוב־ענבר למצב מלא.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-12 rounded-2xl bg-[#2a1838] py-8" dir="ltr">
            <div className="flex flex-col items-center gap-3">
              <span className="text-xs font-medium text-violet-300">לא מלא (Outline)</span>
              <ImpDemonOutlineIcon className="size-32 text-orange-100" />
            </div>

            <div className="flex flex-col items-center gap-3">
              <span className="text-xs font-medium text-amber-300">מלא (Filled)</span>
              <ImpDemonFilledIcon className="size-32 text-amber-400" />
            </div>
          </div>
        </section>

        {/* 3. In Menu Context */}
        <section className="space-y-4 rounded-3xl bg-[#1d1028] p-6 ring-1 ring-orange-500/20">
          <div>
            <h2 className="text-xl font-bold text-orange-100">בהקשר תפריט הפעולות</h2>
            <p className="text-sm text-violet-300">
              השוואת שורה לפני מציאה (לא מלא) ואחרי מציאה (מלא), מול אייקון הדילוג.
            </p>
          </div>

          <div className="space-y-3">
            <MenuRow
              label="מצא שדון (לא מלא)"
              icon={<ImpDemonOutlineIcon className="size-4 text-orange-100" />}
            />
            <MenuRow
              label="מצאתי שדון (מלא)"
              icon={<ImpDemonFilledIcon className="size-4 text-amber-300" />}
              active
            />
            <MenuRow
              label="דילוג (להשוואת עובי קו)"
              icon={<SkipOutlineIcon className="size-4 text-orange-100" />}
            />
          </div>
        </section>

        {/* 4. Multi-Size Matrix */}
        <section className="space-y-6 rounded-3xl bg-[#1d1028] p-6 ring-1 ring-orange-500/20">
          <div>
            <h2 className="text-xl font-bold text-orange-100">מטריצת גדלים</h2>
            <p className="text-sm text-violet-300">
              בדיקת קריאות בכל הגדלים המשמשים בתפריטים ובמפה.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-semibold text-orange-200">לא מלא (Not Full Mode)</h3>
            <div className="flex flex-wrap items-end gap-6 rounded-2xl bg-[#2a1838] p-5">
              {SIZES.map((size) => (
                <div key={size.label} className="flex flex-col items-center gap-2">
                  <span className="text-[11px] text-violet-400">{size.label}</span>
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-[#3d262a]">
                    <ImpDemonOutlineIcon className={cn(size.className, "text-orange-100")} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-semibold text-amber-300">מלא (Full Mode)</h3>
            <div className="flex flex-wrap items-end gap-6 rounded-2xl bg-[#2a1838] p-5">
              {SIZES.map((size) => (
                <div key={size.label} className="flex flex-col items-center gap-2">
                  <span className="text-[11px] text-violet-400">{size.label}</span>
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-[#3d262a]">
                    <ImpDemonFilledIcon className={cn(size.className, "text-amber-400")} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. Original Reference Image */}
        <section className="space-y-4 rounded-3xl bg-[#1d1028] p-6 ring-1 ring-orange-500/20">
          <div>
            <h2 className="text-lg font-medium text-orange-100">התמונה המקורית שלך</h2>
            <p className="text-sm text-violet-300">קובץ המקור שהועלה להשוואה ישירה</p>
          </div>
          <div className="flex justify-center rounded-2xl bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/imp-demon-reference.jpg"
              alt="גרסאות צבע וצורה"
              className="max-h-72 w-auto rounded-xl object-contain"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
