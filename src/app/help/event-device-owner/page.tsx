"use client";

import Link from "next/link";
import { HelpShell, HelpStep } from "@/components/help-shell";
import { helpImage } from "@/lib/help-images";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "אחרי הוספת בית",
    body: "במסך ההצלחה לחצו <<חבר מכשירים>>. נפתח חלון עם 4 קודים — אחד לכל מכשיר (משפחה / שכנים קרובים).",
    image: helpImage("event-device-owner-add.png"),
    imageAlt: "מסך הצלחה עם כפתור חבר מכשירים",
  },
  {
    title: "גם מהמפה",
    body: "בכל זמן: פתחו את כרטיס הבית שלכם → ⋮ → <<חיבור מכשירים>>. אותו מסך קודים.",
    image: helpImage("event-device-owner-menu.png"),
    imageAlt: "תפריט פעולות עם חיבור מכשירים",
  },
  {
    title: "העתקה ומעקב",
    body: "לכל קוד: <<העתק>> — ושלחו את הקוד בעצמכם (הודעה / וואטסאפ / בעל פה). אין כפתור שיתוף עם קישור עד שייצא אפליקציה בחנות. מתחת לקוד: <<פנוי>> = אף מכשיר לא רשום; שם וטלפון = מכשיר מחובר. <<קוד חדש>> מבטל את הקוד הישן אם צריך.",
    image: helpImage("event-device-owner-add.png"),
    imageAlt: "רשימת קודים עם העתק וסטטוס פנוי",
  },
] as const;

export default function EventDeviceOwnerHelpPage() {
  return (
    <HelpShell title="חיבור מכשירים — בעלי בתים">
      <p className="mb-4 text-lg leading-relaxed text-violet-100">
        לכל בית יש עד 4 קודים. כל קוד ניתן לרישום במכשיר אחד בלבד. אתם רואים מי מחובר — אין מונה כללי בשכונה.
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
        href="/help/event-device-visitor"
        className={cn(
          buttonVariants({ variant: "outline", size: "lg" }),
          "mt-5 block w-full border-orange-400/50 bg-orange-500/10 text-lg text-orange-100 hover:bg-orange-500/20",
        )}
      >
        מדריך לאורחים (יש לי קוד)
      </Link>
    </HelpShell>
  );
}
