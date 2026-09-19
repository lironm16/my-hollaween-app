"use client";

import Link from "next/link";
import { HelpShell, HelpStep } from "@/components/help-shell";
import { helpImage } from "@/lib/help-images";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const STEPS: Array<{
  title: string;
  body: ReactNode;
  image: string;
  imageAlt: string;
}> = [
  {
    title: "פתיחת הסינון",
    body: (
      <>
        בסרגל הכלים לחצו על כפתור <strong className="text-orange-200">סינון</strong> (אייקון משפך).
        נפתח חלון מלמטה עם כל האפשרויות: שעות, רמת פחד, ממתקים, נגישות, שכונה, וסימונים שלכם
        (אהבתי / לא ביקרתי / דילגתי).
      </>
    ),
    image: helpImage("filter-1-open.svg"),
    imageAlt: "חלון סינון בתים",
  },
  {
    title: "מה קורה במפה?",
    body: (
      <>
        בתים ש<strong className="text-orange-200">עוברים</strong> את הסינון מוצגים בכתום רגיל
        ברשימה, במסלול, ובמפה. בתים ש<strong className="text-orange-200">לא עוברים</strong>{" "}
        <strong className="text-orange-200">נשארים על המפה</strong> — אבל מוצגים{" "}
        <strong className="text-orange-200">מעומעמים (אפורים)</strong>. אפשר עדיין ללחוץ עליהם
        ולראות פרטים. כדי להחזיר אותם לתוצאות: פתחו שוב סינון, שנהו את הקריטריונים (או לחצו{" "}
        <strong className="text-orange-200">איפוס</strong>) ולחצו{" "}
        <strong className="text-orange-200">הצג תוצאות</strong>.
      </>
    ),
    image: helpImage("filter-2-map-dim.svg"),
    imageAlt: "בתים מסוננים מוצגים במפה באפור",
  },
  {
    title: "שעות מותאמות אישית",
    body: (
      <>
        ב<strong className="text-orange-200">שעות</strong> יש שלוש אפשרויות:
        <br />
        <strong className="text-orange-200">כל שעה</strong> — כל הבתים, בלי הגבלת שעות.
        <br />
        <strong className="text-orange-200">פתוחים עכשיו</strong> — רק בתים פתוחים ברגע זה.
        <br />
        <strong className="text-orange-200">מותאם אישית</strong> — בוחרים חלון זמן (למשל מ-18:30).
        כאן חשוב: הסינון בודק מי <strong className="text-orange-200">יהיה פתוח</strong> בזמן שבחרתם,
        לא מי פתוח <em>עכשיו</em>. לדוגמה: בשעה 17:00 תראו גם בית שיפתח רק ב-19:00 — כי תגיעו אליו
        בזמן שהוא פתוח. בתים שכבר נסגרו לפני השעה שבחרתם לא יופיעו.
      </>
    ),
    image: helpImage("filter-3-custom-times.svg"),
    imageAlt: "בחירת שעות מותאמות אישית",
  },
  {
    title: "הצגת תוצאות",
    body: (
      <>
        אחרי שבחרתם קריטריונים לחצו{" "}
        <strong className="text-orange-200">הצג תוצאות (מספר)</strong> בתחתית החלון. המספר מראה
        כמה בתים עוברים את הסינון. ברשימה ובמסלול יופיעו <strong className="text-orange-200">רק</strong>{" "}
        אלה — שאר הבתים יישארו על המפה באפור. כפתור הסינון בסרגל נדלק בכתום כשיש סינון פעיל.
      </>
    ),
    image: helpImage("filter-4-results.svg"),
    imageAlt: "תוצאות סינון ברשימה",
  },
];

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
