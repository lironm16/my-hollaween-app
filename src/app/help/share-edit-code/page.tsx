"use client";

import { HelpShell, HelpStep } from "@/components/help-shell";
import { helpImage } from "@/lib/help-images";

const STEPS = [
  {
    title: "פתחו את תפריט הפעולות (⋮)",
    body: (
      <>
        במפה או ברשימה, פתחו את כרטיס הבית. בפינה העליונה של הכרטיס לחצו על{" "}
        <strong className="text-orange-200">⋮</strong> (שלוש נקודות).
      </>
    ),
    image: helpImage("share-edit-code-menu.svg"),
    imageAlt: "תפריט פעולות — שלוש נקודות בכרטיס הבית",
  },
  {
    title: "בחרו «קוד עריכה»",
    body: (
      <>
        בתפריט שנפתח בחרו <strong className="text-orange-200">קוד עריכה</strong>. מופיעים רק
        לבעלי הבית או למנהל.
      </>
    ),
    image: helpImage("share-edit-code-menu.svg"),
    imageAlt: "פריט קוד עריכה בתפריט הפעולות",
  },
  {
    title: "העתיקו או שתפו",
    body: (
      <>
        ייפתח חלון עם הקוד בן 6 הספרות. לחצו <strong className="text-orange-200">העתיקו</strong>{" "}
        או <strong className="text-orange-200">שיתוף</strong> כדי לשלוח בוואטסאפ / הודעה.
        מי שמקבל את הקוד מזין אותו פעם אחת ב: תפריט → בית → עריכה → בחרו את הבית → «פתיחה
        לעריכה».
      </>
    ),
    image: helpImage("share-edit-code-dialog.svg"),
    imageAlt: "חלון קוד עריכה עם העתיקו ושיתוף",
  },
] as const;

export default function ShareEditCodeHelpPage() {
  return (
    <HelpShell title="איך לשתף קוד עריכה?">
      <p className="mb-4 text-lg leading-relaxed text-violet-100">
        קוד עריכה מאפשר למישהו אחר לעדכן את הבית שלכם. הדרך המהירה: מתוך כרטיס הבית → ⋮ → קוד
        עריכה.
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
    </HelpShell>
  );
}
