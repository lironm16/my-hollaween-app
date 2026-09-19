"use client";

import Link from "next/link";
import { HelpShell, HelpStep } from "@/components/help-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "מפה או רשימה",
    body: (
      <>
        במהלך המסלול אפשר לעבור בין <strong className="text-orange-200">מפה</strong> ל
        <strong className="text-orange-200">רשימה</strong> בסרגל. ברשימה רואים את הסדר המדויק
        ומרחק ההליכה לכל עצירה. במפה — את הקו הכתום ואת כל הבתים על המפה.
      </>
    ),
    image: "/help/route-during-exit.svg",
    imageAlt: "מעבר בין מפה לרשימה במסלול",
  },
  {
    title: "עקוב אחרי הקו",
    body: (
      <>
        במפה, הקו הכתום מראה את סדר ההליכה. כפתור <strong className="text-orange-200">סיכום</strong>{" "}
        (מספר הבתים) מציג מרחק כולל, זמן משוער וכמה דילגתם.
      </>
    ),
    image: "/help/route-during-map.svg",
    imageAlt: "קו מסלול על המפה",
  },
  {
    title: "ביקור, דילוג, פרטים",
    body: (
      <>
        בכל בית: לחצו על הכרטיס לפרטים מלאים. בתפריט <strong className="text-orange-200">⋮</strong>{" "}
        אפשר לסמן <strong className="text-orange-200">ביקרתי</strong>,{" "}
        <strong className="text-orange-200">דילוג</strong> (זמני או קבוע), או{" "}
        <strong className="text-orange-200">ניווט</strong> ל-Google Maps. בית שדילגתם עליו יופיע
        בנפרד — אפשר להחזיר למסלול.
      </>
    ),
    image: "/help/route-during-actions.svg",
    imageAlt: "סימון ביקור ודילוג במסלול",
  },
  {
    title: "שינוי התחלה ויציאה",
    body: (
      <>
        בראש הרשימה: <strong className="text-orange-200">שינוי</strong> לנקודת התחלה אחרת — המסלול
        יחושב מחדש. לסיום: לחצו שוב על כפתור <strong className="text-orange-200">מסלול</strong>{" "}
        (כשהוא דולק) כדי לצאת ממצב מסלול.
      </>
    ),
    image: "/help/route-2-origin.svg",
    imageAlt: "שינוי נקודת התחלה",
  },
] as const;

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
