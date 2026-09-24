"use client";

import Link from "next/link";
import { HelpShell, HelpStep } from "@/components/help-shell";
import { helpImage } from "@/lib/help-images";

const STEPS = [
  {
    title: "פתיחת הסינון",
    body: "בסרגל הכלים לחצו על כפתור <<סינון>> (אייקון משפך). נפתח חלון מלמטה עם כל האפשרויות: שעות, רמת פחד, ממתקים, נגישות, שכונה, וסימונים שלכם (אהבתי / לא ביקרתי / דילגתי).",
    image: helpImage("filter-1-open.png"),
    imageAlt: "חלון סינון בתים",
  },
  {
    title: "מה קורה במפה?",
    body: "בתים ש**עוברים** את הסינון מוצגים בכתום רגיל ברשימה, במסלול, ובמפה. בתים ש**לא עוברים** **נשארים על המפה** — אבל מוצגים **מעומעמים (אפורים)**. אפשר עדיין ללחוץ עליהם ולראות פרטים. כדי להחזיר אותם לתוצאות: פתחו שוב סינון, שנהו את הקריטריונים (או לחצו <<איפוס>>) ולחצו <<הצג תוצאות>>.",
    image: helpImage("filter-2-map-dim.png"),
    imageAlt: "בתים מסוננים מוצגים במפה באפור",
  },
  {
    title: "שעות מותאמות אישית",
    body: "ב**שעות** יש שלוש אפשרויות:\n**כל שעה** — כל הבתים, בלי הגבלת שעות.\n**פתוחים עכשיו** — רק בתים פתוחים ברגע זה.\n**מותאם אישית** — בוחרים חלון זמן (למשל מ-18:30). כאן חשוב: הסינון בודק מי **יהיה פתוח** בזמן שבחרתם, לא מי פתוח *עכשיו*. לדוגמה: בשעה 17:00 תראו גם בית שיפתח רק ב-19:00 — כי תגיעו אליו בזמן שהוא פתוח. בתים שכבר נסגרו לפני השעה שבחרתם לא יופיעו.",
    image: helpImage("filter-3-custom-times.png"),
    imageAlt: "בחירת שעות מותאמות אישית",
  },
  {
    title: "הצגת תוצאות",
    body: "אחרי שבחרתם קריטריונים לחצו <<הצג תוצאות (מספר)>> בתחתית החלון. המספר מראה כמה בתים עוברים את הסינון. ברשימה ובמסלול יופיעו **רק** אלה — שאר הבתים יישארו על המפה באפור. כפתור הסינון בסרגל נדלק בכתום כשיש סינון פעיל.",
    image: helpImage("filter-4-results.png"),
    imageAlt: "תוצאות סינון ברשימה",
  },
] as const;

export default function FilterHelpPage() {
  return (
    <HelpShell title="איך מסננים בתים?">
      <p className="mb-4 text-lg leading-relaxed text-violet-100">
        הסינון מצמצם את הרשימה והמסלול לבתים שמתאימים לכם — אבל במפה רואים את כולם, כדי שלא
        תאבדו הקשר.
      </p>
      <ol className="space-y-4">
        {STEPS.map((step, index) => (
          <HelpStep
            key={step.title}
            n={index + 1}
            title={step.title}
            body={step.body}
            image={step.image}
            imageAlt={step.imageAlt}
          />
        ))}
      </ol>
      <p className="mt-5 text-center text-lg text-violet-200">
        <Link
          href="/help/create-route"
          className="text-orange-300 underline underline-offset-2 hover:text-orange-200"
        >
          המשך: איך יוצרים מסלול?
        </Link>
      </p>
    </HelpShell>
  );
}
