"use client";

import Link from "next/link";
import { HelpShell, HelpStep } from "@/components/help-shell";
import { helpImage } from "@/lib/help-images";
import { HOUSE_ACCESS_CODE_LENGTH } from "@/lib/night-pass-copy";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DeviceHelpStep = {
  title: string;
  body: string;
  image?: string;
  imageAlt?: string;
};

const STEPS: DeviceHelpStep[] = [
  {
    title: "קוד אחד — עריכה וחיבור",
    body: `**קוד עריכה** (${HOUSE_ACCESS_CODE_LENGTH} ספרות) הוא גם **קוד החיבור** למכשירים. מי שמזין אותו נרשם למכשיר, יכול לערוך את הבית (אם בעלים/עורך), ורואה כתובות מלאות ביום החשיפה. אין קוד נפרד של 8 תווים.`,
    image: helpImage("event-device-owner-dialog.png"),
    imageAlt: "חלון קוד עריכה ומכשירים עם קוד בן 6 ספרות",
  },
  {
    title: "איפה פותחים את המסך?",
    body: "**אחרי הוספת בית:** במסך ההצלחה לחצו **«קוד עריכה ומכשירים»**. **בכל זמן:** כרטיס הבית → ⋮ → **«קוד עריכה ומכשירים»**.",
    image: helpImage("event-device-owner-menu.png"),
    imageAlt: "תפריט פעולות עם קוד עריכה ומכשירים",
  },
  {
    title: "שיתוף ומעקב",
    body: "«העתק» — ושלחו את הקוד (וואטסאפ / SMS). אפשר גם **קישור הזמנה** מהחלון. ברשימה למטה: שם, טלפון ותפקיד (**בעל בית** / **עורך**) לכל מכשיר. «קוד כניסה חדש» / איפוס — מנתק את כל המכשירים ודורש קוד מעודכן.",
    image: helpImage("event-device-owner-dialog.png"),
    imageAlt: "רשימת מכשירים מחוברים מתחת לקוד",
  },
  {
    title: "בעלי בית — «חיבור לאירוע»",
    body: "במכשיר שבו הוספתם את הבית אפשר גם **«חיבור לאירוע (בעלי בית)»** בראש המפה — בלי להקליד קוד. עורכים ואורחים משתמשים באותו **קוד עריכה** (6 ספרות) או בקישור הזמנה.",
    image: helpImage("event-device-owner-success.png"),
    imageAlt: "מסך הצלחה אחרי הוספת בית עם כפתור קוד עריכה ומכשירים",
  },
];

export default function EventDeviceOwnerHelpPage() {
  return (
    <HelpShell title="קוד עריכה ומכשירים — בעלי בתים">
      <div className="mb-5 space-y-3 rounded-2xl bg-orange-500/10 p-4 ring-1 ring-orange-400/30">
        <p className="text-lg leading-relaxed text-orange-50">
          עד <strong>4 מכשירים</strong> לכל בית — כולם עם אותו קוד משפחה ({HOUSE_ACCESS_CODE_LENGTH} ספרות).
        </p>
        <p className="text-base leading-relaxed text-violet-100/95">
          מי שלא מחובר רואה את הבית על המפה בלי כתובת מלאה עד יום החשיפה.
        </p>
      </div>
      <ol className="space-y-6">
        {STEPS.map((step, i) => (
          <HelpStep
            key={step.title}
            n={i + 1}
            title={step.title}
            body={step.body}
            image={step.image}
            imageAlt={step.imageAlt}
          />
        ))}
      </ol>
      <Link
        href="/help/event-device-visitor"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "mt-6 w-full border-orange-400/50 bg-orange-500/10 text-lg text-orange-100 hover:bg-orange-500/20",
        )}
      >
        מדריך למשפחה ואורחים — חיבור מכשיר
      </Link>
    </HelpShell>
  );
}
