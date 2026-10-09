"use client";

import { HelpShell } from "@/components/help-shell";
import { renderHelpText } from "@/lib/render-help-text";

const VISITOR_STEPS = [
  "ליד הדלת תלוי דף ביקור עם קוד QR.",
  "פותחים את <<מצלמה>> בטלפון ומכוונים אל הקוד — אין צורך באפליקציה מיוחדת לסריקה. באנדרואיד אפשר גם Google Lens.",
  "לוחצים על הקישור שקופץ על המסך.",
  "האפליקציה נפתחת על הבית והוא מסומן <<ביקרתי>> — בדיוק כמו לחיצה בתפריט. עובד גם בלי להתקין את האפליקציה.",
] as const;

const OWNER_STEPS = [
  "פותחים את הבית שלכם במפה או ברשימה.",
  "לוחצים על <<פעולות>> ובוחרים <<הצג דף ביקור>>.",
  "לוחצים <<הדפסה>> ותולים את הדף ליד הדלת.",
  "בספארי באייפון מופיעה לפעמים הודעה על חסימת הדפסה אוטומטית — לוחצים <<Allow>> (אפשר) כדי לפתוח את חלון ההדפסה כרגיל.",
] as const;

function Steps({ steps }: { steps: readonly string[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, index) => (
        <li key={step} className="flex gap-3">
          <span
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-lg font-bold text-black"
            aria-hidden
          >
            {index + 1}
          </span>
          <span className="pt-1 text-lg leading-relaxed text-orange-50">{renderHelpText(step)}</span>
        </li>
      ))}
    </ol>
  );
}

export default function ScanVisitHelpPage() {
  return (
    <HelpShell title="סריקת QR לביקור">
      <div className="space-y-5">
        <section className="space-y-4 rounded-2xl bg-[#1d1028] p-5 ring-1 ring-orange-500/25">
          <h2 className="text-xl font-semibold text-orange-200">איך סורקים?</h2>
          <Steps steps={VISITOR_STEPS} />
          <p className="text-base leading-relaxed text-violet-200">
            סרקתם שוב את אותו בית? הוא נשאר מסומן «ביקרתי» — הסריקה לא מבטלת ביקור.
          </p>
        </section>
        <section className="space-y-4 rounded-2xl bg-[#1d1028] p-5 ring-1 ring-orange-500/25">
          <h2 className="text-xl font-semibold text-orange-200">בעלי בית — איך מדפיסים?</h2>
          <Steps steps={OWNER_STEPS} />
          <div className="space-y-2 rounded-xl border border-orange-500/30 bg-orange-950/40 p-3 text-sm leading-relaxed text-orange-200">
            <p>
              <strong>הודעה בספארי באייפון?</strong> אם קופצת חלונית «This website has been blocked from automatically printing», לחצו על{" "}
              <strong>Allow</strong> (אפשר). זוהי הגנת אבטחה שגרתית של אפל לחלונות הדפסה מאתרים.
            </p>
            <p>
              <strong>ספארי במק?</strong> אם מופיע דף שני ריק או שהדף נחתך — בחלון ההדפסה כבו «כותרות ותחתיות» (Headers and Footers) וודאו שהגודל הוא 100%.
            </p>
          </div>
        </section>
      </div>
    </HelpShell>
  );
}
