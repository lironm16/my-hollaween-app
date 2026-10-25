"use client";

import Link from "next/link";
import { HelpShell, HelpStep } from "@/components/help-shell";
import { helpImage } from "@/lib/help-images";
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
    title: "מה זה קוד כניסה?",
    body: "קוד כניסה (8 תווים) מאפשר למכשיר **אחד** לראות כתובות מלאות ופרטי ביקור בבית שלכם. זה לא קוד עריכה — עורכים ממשיכים להשתמש בקוד העריכה (6 ספרות) או בקישור הזמנה.",
    image: helpImage("event-device-owner-add.png"),
    imageAlt: "מסך קודי כניסה לבעלי בית",
  },
  {
    title: "איפה מוצאים את המסך?",
    body: "**אחרי הוספת בית:** במסך ההצלחה לחצו «חבר מכשירים». **בכל זמן:** פתחו את כרטיס הבית → ⋮ → «חיבור מכשירים».",
    image: helpImage("event-device-owner-menu.png"),
    imageAlt: "תפריט פעולות עם חיבור מכשירים",
  },
  {
    title: "שליחה והחלפה",
    body: "לכל אחד מ־4 הקודים: «העתק» — ושלחו בעצמכם (וואטסאפ / SMS / בעל פה). **פנוי** = עדיין אף מכשיר לא נרשם. **שם וטלפון** = מכשיר מחובר. «קוד כניסה חדש» מבטל את הקוד הישן אם צריך לנתק מישהו.",
    image: helpImage("event-device-owner-add.png"),
    imageAlt: "העתקת קוד כניסה וסטטוס מכשיר",
  },
  {
    title: "«חבר אותי» על המכשיר שלכם",
    body: "בעל בית יכול ללחוץ «חבר אותי» כדי לרשום את **המכשיר הנוכחי** בלי להקליד קוד. אם כבר יש מכשיר אחר — תופיע אזהרה לפני החלפה.",
  },
];

export default function EventDeviceOwnerHelpPage() {
  return (
    <HelpShell title="חיבור מכשירים — בעלי בתים">
      <div className="mb-5 space-y-3 rounded-2xl bg-orange-500/10 p-4 ring-1 ring-orange-400/30">
        <p className="text-lg leading-relaxed text-orange-50">
          עד <strong>4 מכשירים</strong> לכל בית (משפחה, שכנים קרובים). כל מכשיר = קוד כניסה נפרד.
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
        מדריך לאורחים — יש לי קוד כניסה
      </Link>
    </HelpShell>
  );
}
