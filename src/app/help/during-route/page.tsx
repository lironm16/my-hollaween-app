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
}> = [
  {
    title: "מפה או רשימה",
    body: (
      <>
        במהלך המסלול אפשר לעבור בין <HelpUiChip>מפה</HelpUiChip> ל
        <HelpUiChip>רשימה</HelpUiChip> בסרגל. ברשימה רואים את הסדר המדויק ומרחק ההליכה לכל
        עצירה. במפה — את הקו הכתום ואת כל הבתים על המפה.
      </>
    ),
    image: helpImage("route-during-exit.png"),
    imageAlt: "מעבר בין מפה לרשימה במסלול",
  },
  {
    title: "עקוב אחרי הקו",
    body: (
      <>
        במפה, הקו הכתום מראה את סדר ההליכה. כפתור <HelpUiChip>סיכום</HelpUiChip> (מספר הבתים)
        מציג מרחק כולל, זמן משוער וכמה דילגתם.
      </>
    ),
    image: helpImage("route-during-map.png"),
    imageAlt: "קו מסלול על המפה",
  },
  {
    title: "ביקור, דילוג, פרטים",
    body: (
      <>
        בכל בית: לחצו על הכרטיס לפרטים מלאים. בתפריט <HelpUiChip>⋮</HelpUiChip> אפשר לסמן{" "}
        <HelpUiChip>ביקרתי</HelpUiChip>, <HelpUiChip>דילוג</HelpUiChip> (זמני או קבוע), או{" "}
        <HelpUiChip>ניווט</HelpUiChip> ל-Google Maps. בית שדילגתם עליו יופיע בנפרד — אפשר
        להחזיר למסלול.
      </>
    ),
    image: helpImage("route-during-actions.png"),
    imageAlt: "סימון ביקור ודילוג במסלול",
  },
  {
    title: "שינוי התחלה ויציאה",
    body: (
      <>
        בראש הרשימה: <HelpUiChip>שינוי</HelpUiChip> לנקודת התחלה אחרת — המסלול יחושב מחדש.
        לסיום: לחצו שוב על כפתור <HelpUiChip>מסלול</HelpUiChip> (כשהוא דולק) כדי לצאת ממצב
        מסלול.
      </>
    ),
    image: helpImage("route-during-exit.png"),
    imageAlt: "שינוי נקודת התחלה ויציאה מהמסלול",
  },
];

export default function DuringRouteHelpPage() {
  return (
    <HelpShell title="במהלך המסלול">
      <p className="mb-4 text-lg leading-relaxed text-violet-100">
        אחרי שהפעלתם מסלול — עקבו אחרי הסדר, סמנו ביקורים, ודלגו על בתים שלא מתאימים.
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
      <Link
        href="/help/create-route"
        className={cn(
          buttonVariants({ variant: "outline", size: "lg" }),
          "mt-5 block w-full border-orange-400/50 bg-orange-500/10 text-center text-lg text-orange-100 hover:bg-orange-500/20",
        )}
      >
        עדיין לא יצרתם מסלול? מדריך יצירה
      </Link>
    </HelpShell>
  );
}
