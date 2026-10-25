"use client";

import Link from "next/link";
import { HelpShell, HelpStep } from "@/components/help-shell";
import { helpImage } from "@/lib/help-images";
import {
  HOUSE_ACCESS_CODE_LENGTH,
  NIGHT_PASS_BANNER_CTA,
  NIGHT_PASS_REVEAL_HINT,
} from "@/lib/night-pass-copy";
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
    title: "איזה קוד מקבלים?",
    body: `מבעלי הבית: **קוד עריכה** בן **${HOUSE_ACCESS_CODE_LENGTH} ספרות** — אותו קוד שמשמש לעריכת הבית. אין קוד «כניסה» נפרד. אפשר גם **קישור הזמנה** (בלי להקליד ספרות).`,
  },
  {
    title: `«${NIGHT_PASS_BANNER_CTA}» במפה`,
    body: `אם המכשיר עדיין לא מחובר, יופיע פס בראש המפה. לחצו **«${NIGHT_PASS_BANNER_CTA}»**, הזינו את **קוד העריכה** (${HOUSE_ACCESS_CODE_LENGTH} ספרות) + שם + טלפון, ואז **«הרשמה»**.`,
    image: helpImage("event-device-visitor-banner.png"),
    imageAlt: "פס יש לי קוד כניסה בראש המפה",
  },
  {
    title: "אחרי ההרשמה",
    body: "החלון נסגר והמפה מתעדכנת. אותו קוד עובד ב**מכשיר אחד** בכל רגע — אם נרשמתם ממכשיר אחר, הקודם מתנתק. **התנתק** בתפריט משחרר רק את המכשיר הזה; הקוד נשאר תקף.",
    image: helpImage("event-device-visitor-register.png"),
    imageAlt: "טופס הרשמה עם קוד כניסה 6 ספרות",
  },
  {
    title: "בתפריט",
    body: `ב☰ תראו **«מכשיר מחובר»** והשם שהזנתם. ${NIGHT_PASS_REVEAL_HINT}`,
    image: helpImage("event-device-visitor-menu.png"),
    imageAlt: "פס מכשיר מחובר בתפריט",
  },
];

export default function EventDeviceVisitorHelpPage() {
  return (
    <HelpShell title="חיבור מכשיר — משפחה ואורחים">
      <div className="mb-5 space-y-3 rounded-2xl bg-orange-500/10 p-4 ring-1 ring-orange-400/30">
        <p className="text-lg leading-relaxed text-orange-50">
          קוד עריכה ({HOUSE_ACCESS_CODE_LENGTH} ספרות) מבעלי הבית = הרשמת המכשיר + גישה לכתובות ופרטי ביקור.
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
        href="/help/event-device-owner"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "mt-6 w-full border-orange-400/50 bg-orange-500/10 text-lg text-orange-100 hover:bg-orange-500/20",
        )}
      >
        בעלי בתים — שיתוף קוד ומכשירים
      </Link>
    </HelpShell>
  );
}
