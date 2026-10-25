"use client";

import Link from "next/link";
import { HelpShell, HelpStep } from "@/components/help-shell";
import { helpImage } from "@/lib/help-images";
import { NIGHT_PASS_REVEAL_HINT } from "@/lib/night-pass-copy";
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
    title: "מקבלים קוד מבעלי בית",
    body: "קוד כניסה בן **8 תווים** (לא קוד עריכה). בעלי הבית מעתיקים אותו מהמסך «חיבור מכשירים» ושולחים אליכם.",
  },
  {
    title: "«יש לי קוד כניסה» במפה",
    body: "אם המכשיר עדיין לא מחובר, יופיע פס בראש המפה. לחצו **«יש לי קוד כניסה»**, הזינו קוד + שם + טלפון, ואז **«הרשמה»**.",
    image: helpImage("event-device-visitor-banner.png"),
    imageAlt: "פס יש לי קוד כניסה בראש המפה",
  },
  {
    title: "טופס ההרשמה",
    body: "אחרי «הרשמה» החלון נסגר והמפה מתעדכנת. אותו קוד אפשר להשתמש שוב רק **במכשיר אחד** בכל פעם — התנתקות משחררת את המכשיר, לא מוחקת את הקוד.",
    image: helpImage("event-device-visitor-register.png"),
    imageAlt: "טופס הרשמת מכשיר עם קוד כניסה",
  },
  {
    title: "אחרי החיבור",
    body: `בתפריט ☰ תראו «מכשיר מחובר» ואת השם שהזנתם. **התנתק** מסיר רק את המכשיר הזה — אפשר להירשם שוב עם אותו קוד. ${NIGHT_PASS_REVEAL_HINT}`,
    image: helpImage("event-device-visitor-menu.png"),
    imageAlt: "פס מכשיר מחובר בתפריט",
  },
];

export default function EventDeviceVisitorHelpPage() {
  return (
    <HelpShell title="יש לי קוד כניסה — אורחים">
      <div className="mb-5 space-y-3 rounded-2xl bg-orange-500/10 p-4 ring-1 ring-orange-400/30">
        <p className="text-lg leading-relaxed text-orange-50">
          קוד כניסה פותח **כתובות ופרטי ביקור** של בתים פרטיים **במכשיר שלכם** — לא צריך להוריד אפליקציה מחנות.
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
        בעלי בתים — איך מחלקים קודים?
      </Link>
    </HelpShell>
  );
}
