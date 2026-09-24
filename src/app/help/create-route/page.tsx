"use client";

import Link from "next/link";
import { HelpShell, HelpStep } from "@/components/help-shell";
import { HelpUiChip } from "@/components/help-ui-chip";
import { helpImage } from "@/lib/help-images";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const STEPS: Array<{
  title: string;
  body: ReactNode;
  image: string;
  imageAlt: string;
  action?: ReactNode;
}> = [
  {
    title: "סינון (אופציונלי)",
    body: (
      <>
        לפני המסלול אפשר לסנן בתים: רמת פחד, ממתקים, נגישות, שכונה ועוד — כפתור{" "}
        <HelpUiChip>סינון</HelpUiChip> בסרגל. רק בתים שעוברים את הסינון נכנסים למסלול. בתים
        שכבר סימנתם כ<strong className="text-orange-200">ביקור</strong> לא נכללים. בתים שלא
        עוברים סינון <strong className="text-orange-200">נשארים על המפה באפור</strong> — כדי
        להחזיר אותם, שנהו את הסינון.
      </>
    ),
    image: helpImage("route-1-filters.png"),
    imageAlt: "חלון סינון בתים",
    action: (
      <Link
        href="/help/filter"
        className={cn(
          buttonVariants({ variant: "outline", size: "lg" }),
          "w-full border-orange-400/50 bg-orange-500/10 text-lg text-orange-100 hover:bg-orange-500/20",
        )}
      >
        מדריך מלא: איך מסננים?
      </Link>
    ),
  },
  {
    title: "נקודת התחלה",
    body: (
      <>
        לחצו על כפתור <HelpUiChip>📍</HelpUiChip> בסרגל ובחרו מאיפה יוצאים: מיקום נוכחי (GPS),
        מרכז השכונה, או נקודה על המפה. המסלול מחושב מהנקודה הזו.
      </>
    ),
    image: helpImage("route-2-origin.png"),
    imageAlt: "בחירת נקודת התחלה",
  },
  {
    title: "הפעלת מסלול",
    body: (
      <>
        לחצו על כפתור <HelpUiChip>מסלול</HelpUiChip> (אייקון שביל) בסרגל הכלים. הכפתור נדלק
        בכתום — המסלול פעיל. אם בחרתם GPS ועדיין אין מיקום, תתבקשו לאשר גישה למיקום.
      </>
    ),
    image: helpImage("route-3-enable.png"),
    imageAlt: "הפעלת מסלול מהסרגל",
  },
  {
    title: "צפייה במסלול",
    body: (
      <>
        ב<HelpUiChip>מפה</HelpUiChip>: קו כתום מחבר את העצירות לפי הסדר. ב
        <HelpUiChip>רשימה</HelpUiChip>: סיכום (בתים, עצירות, מרחק, זמן משוער) ואז רשימת
        עצירות ממוספרות עם מרחק הליכה בין כל תחנה.
      </>
    ),
    image: helpImage("route-4-summary.png"),
    imageAlt: "סיכום מסלול ורשימת עצירות",
  },
];

export default function CreateRouteHelpPage() {
  return (
    <HelpShell title="איך יוצרים מסלול?">
      <p className="mb-4 text-lg leading-relaxed text-violet-100">
        המסלול בונה אוטומטית סדר ביקור בבתים לפי הסינון, נקודת ההתחלה, ומרחק הליכה. אין צורך
        לבחור ידנית כל בית.
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
            action={step.action}
          />
        ))}
      </ol>
      <p className="mt-5 text-center text-lg text-violet-200">
        <Link href="/help/during-route" className="text-orange-300 underline underline-offset-2 hover:text-orange-200">
          המשך: מה עושים במהלך המסלול?
        </Link>
      </p>
    </HelpShell>
  );
}
