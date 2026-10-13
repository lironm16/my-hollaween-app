"use client";

import Link from "next/link";
import { HelpShell, HelpStep } from "@/components/help-shell";
import { helpImage } from "@/lib/help-images";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "אחרי הוספת בית",
    body: "במסך ההצלחה לחצו חבר מכשירים. נפתח חלון עם 4 קודי כניסה — אחד לכל מכשיר (משפחה / שכנים קרובים).",
    image: helpImage("event-device-owner-add.png"),
    imageAlt: "מסך הצלחה עם כפתור חבר מכשירים",
  },
  {
    title: "גם מהמפה",
    body: "בכל זמן: פתחו את כרטיס הבית שלכם → ⋮ → חיבור מכשירים. אותו מסך קודי כניסה.",
    image: helpImage("event-device-owner-menu.png"),
    imageAlt: "תפריט פעולות עם חיבור מכשירים",
  },
  {
    title: "העתקה ומעקב",
    body: "לכל קוד כניסה: העתק — ושלחו את קוד הכניסה בעצמכם (הודעה / וואטסאפ / בעל פה). אין כפתור שיתוף עם קישור עד שייצא אפליקציה בחנות. מתחת לקוד: פנוי = אף מכשיר לא רשום; שם וטלפון = מכשיר מחובר. חבר אותי מחבר את המכשיר הזה (גם אם כבר יש מכשיר אחר — עם אזהרה). קוד כניסה חדש מבטל את קוד הכניסה הישן אם צריך.",
    image: helpImage("event-device-owner-add.png"),
    imageAlt: "רשימת קודי כניסה עם העתק וסטטוס פנוי",
  },
] as const;

export default function EventDeviceOwnerHelpPage() {
  return (
    <HelpShell title="חיבור מכשירים — בעלי בתים">
      <p className="mb-4 text-lg leading-relaxed text-violet-100">
        לכל בית עד 4 קודי כניסה — מכשיר אחד לכל קוד. מי שמחובר רואה כתובות ופרטי ביקור.
      </p>
      <ol className="space-y-6">
        {STEPS.map((step, i) => (
          <HelpStep key={step.title} index={i + 1} {...step} />
        ))}
      </ol>
      <Link
        href="/help/event-device-visitor"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "mt-6 w-full border-orange-400/50 bg-orange-500/10 text-lg text-orange-100 hover:bg-orange-500/20",
        )}
      >
        מבקרים — יש לי קוד כניסה
      </Link>
    </HelpShell>
  );
}
