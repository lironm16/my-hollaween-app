import { PreviewNav } from "@/components/preview-nav";
import { config } from "@/lib/config";

const samples = {
  welcome: "ברוכים הבאים ל",
  brandHe: config.brandHe,
  neighborhood: config.neighborhood,
  evening: "תחילת הערב בשכונה",
};

export default function CountdownFontsPreviewPage() {
  return (
    <div className="min-h-dvh bg-[#2e2248] px-4 py-6 text-orange-50" dir="rtl">
      <div className="mx-auto max-w-lg space-y-6 pb-16">
        <header className="space-y-3">
          <p className="text-base text-violet-300">{config.brandEn} · גופנים למסך ספירה</p>
          <h1 className="font-display text-2xl text-orange-100">השוואת גופנים — עברית מול אימה</h1>
          <p className="text-base leading-relaxed text-violet-200">
            כרגע באנגלית משתמשים ב־Creepster (טיפות). בעברית משתמשים ב־Rubik רגיל. למטה אפשר לראות
            את Rubik Wet Paint — גרסה &quot;מטפטפת&quot; של Rubik עם תמיכה בעברית.
          </p>
          <PreviewNav current="/preview/countdown-fonts" />
        </header>

        <section className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20">
          <h2 className="text-base font-semibold text-orange-200">1 · מה יש לנו היום</h2>
          <div className="countdown-font-sample-rubik space-y-4 rounded-xl bg-[#362a58] p-4">
            <div>
              <p className="mb-1 text-sm text-violet-300">עברית — Rubik (נקי)</p>
              <p className="text-[clamp(1.25rem,5.5vw,2rem)] font-extrabold">{samples.welcome}</p>
              <p className="countdown-font-brand-he text-[clamp(1.75rem,7.5vw,2.85rem)] font-extrabold leading-tight text-[#c4b5fd]">
                {samples.brandHe}
              </p>
            </div>
            <div dir="ltr">
              <p className="mb-1 text-sm text-violet-300">אנגלית — Creepster (טיפות, בלי עברית)</p>
              <p className="countdown-font-creepster text-[clamp(2.75rem,14vw,4.75rem)] text-[#fb923c]">
                {config.brandEn}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20">
          <h2 className="text-base font-semibold text-orange-200">2 · Rubik Wet Paint (Google Fonts, עברית ✓)</h2>
          <p className="text-sm leading-relaxed text-violet-200">
            גופן &quot;צבע רטוב / טיפות&quot; — הכי קרוב לסגנון Creepster בעברית. חינמי מ־Google Fonts.
          </p>
          <div className="countdown-font-sample-wet-paint space-y-4 rounded-xl bg-[#362a58] p-4">
            <p className="text-[clamp(1.25rem,5.5vw,2rem)] text-white">{samples.welcome}</p>
            <p className="text-[clamp(1.75rem,7.5vw,2.85rem)] leading-tight text-[#c4b5fd]">{samples.brandHe}</p>
            <p className="text-[clamp(1rem,3.8vw,1.2rem)] text-orange-100/90">{samples.neighborhood}</p>
            <p className="text-[clamp(0.95rem,3.6vw,1.1rem)] text-violet-200/85">{samples.evening}</p>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20">
          <h2 className="text-base font-semibold text-orange-200">3 · הצעה: שילוב</h2>
          <div className="space-y-3 rounded-xl bg-[#362a58] p-4 text-sm leading-relaxed text-violet-100">
            <p>
              <span className="text-orange-300">Rubik Wet Paint</span> ל־&quot;{samples.brandHe}&quot; ואולי
              &quot;{samples.welcome}&quot;
            </p>
            <p>
              <span className="text-orange-300">Creepster</span> נשאר לימים, שעות ו־{config.brandEn}
            </p>
            <p>
              <span className="text-orange-300">Rubik רגיל</span> לשורות קטנות (שכונה, סגירה) — קריאות
            </p>
          </div>
        </section>

        <section className="space-y-2 rounded-2xl border border-dashed border-orange-500/30 p-4">
          <h2 className="text-base font-semibold text-orange-200">הערות</h2>
          <ul className="list-disc space-y-1 pe-4 text-sm text-violet-200">
            <li>Creepster תומך רק באנגלית — עברית בו נראית כמו ג&apos;יברish.</li>
            <li>Rubik Wet Paint פחות קריא בגדלים קטנים; מתאים לכותרות.</li>
            <li>אין לנו כרגע גופן מותקן במסך האמיתי — רק תצוגה מקדימה. תגידו אם לאמץ.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
