"use client";

import { HelpShell, HelpStep } from "@/components/help-shell";
import { HelpUiChip } from "@/components/help-ui-chip";
import { helpImage } from "@/lib/help-images";
import type { ReactNode } from "react";

const STEPS: Array<{
  title: ReactNode;
  body: ReactNode;
  image: string;
  imageAlt: string;
}> = [
  {
    title: "פתחו את תפריט הפעולות (⋮)",
    body: (
      <>
        במפה או ברשימה, פתחו את כרטיס הבית. בפינה העליונה של הכרטיס לחצו על{" "}
        <HelpUiChip>⋮</HelpUiChip> (שלוש נקודות).
      </>
    ),
    image: helpImage("share-edit-code-menu.png"),
    imageAlt: "תפריט פעולות — שלוש נקודות בכרטיס הבית",
  },
  {
    title: (
      <>
        בחרו <HelpUiChip>קוד עריכה</HelpUiChip>
      </>
    ),
    body: (
      <>
        בתפריט שנפתח בחרו <HelpUiChip>קוד עריכה</HelpUiChip>. מופיעים רק לבעלי הבית או למנהל.
      </>
    ),
    image: helpImage("share-edit-code-menu.png"),
    imageAlt: "פריט קוד עריכה בתפריט הפעולות",
  },
  {
    title: "העתיקו או שתפו",
    body: (
      <>
        ייפתח חלון עם הקוד בן 6 הספרות. לחצו <HelpUiChip>העתיקו</HelpUiChip> או{" "}
        <HelpUiChip>שיתוף</HelpUiChip> כדי לשלוח בוואטסאפ / הודעה. מי שמקבל את הקוד מזין אותו
        פעם אחת ב: תפריט → בית → עריכה → בחרו את הבית →{" "}
        <HelpUiChip>פתיחה לעריכה</HelpUiChip>.
      </>
    ),
    image: helpImage("share-edit-code-dialog.png"),
    imageAlt: "חלון קוד עריכה עם העתיקו ושיתוף",
  },
];

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
            key={index}
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
