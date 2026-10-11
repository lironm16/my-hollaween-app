"use client";

import Link from "next/link";
import { HelpShell, HelpStep } from "@/components/help-shell";
import { helpImage } from "@/lib/help-images";
import { NIGHT_PASS_REVEAL_HINT } from "@/lib/night-pass-copy";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "«יש לי קוד» במפה",
    body: "אם עדיין לא רשומים, מופיעה פס כהה בראש המפה. לחצו <<יש לי קוד>>.",
    image: helpImage("event-device-visitor-banner.png"),
    imageAlt: "פס יש לי קוד בראש המפה",
  },
  {
    title: "הרשמת המכשיר",
    body: "הזינו את הקוד בן 8 התווים (מקבלים מבעלי בית), שם וטלפון נייד. <<הרשמה>> — החלון נסגר והמפה מתעדכנת.",
    image: helpImage("event-device-visitor-register.png"),
    imageAlt: "טופס הרשמת מכשיר עם קוד שם וטלפון",
  },
  {
    title: "אחרי החיבור",
    body: `בתפריט ☰ תראו <<מכשיר מחובר>> ושם. <<התנתקות>> משחררת רק את המכשיר הזה — הקוד נשאר תקף לכניסה מחדש. ${NIGHT_PASS_REVEAL_HINT}`,
    image: helpImage("event-device-visitor-menu.png"),
    imageAlt: "פס מכשיר מחובר בתפריט הצד",
  },
] as const;

export default function EventDeviceVisitorHelpPage() {
  return (
    <HelpShell title="יש לי קוד — אורחים">
      <p className="mb-4 text-lg leading-relaxed text-violet-100">
        הקוד מיועד למכשיר אחד. אם מישהו אחר נרשם עם אותו קוד במכשיר שני — המכשיר הראשון יתנתק ויצטרך קוד חדש מבעלי הבית.
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
        href="/help/event-device-owner"
        className={cn(
          buttonVariants({ variant: "outline", size: "lg" }),
          "mt-5 block w-full border-orange-400/50 bg-orange-500/10 text-lg text-orange-100 hover:bg-orange-500/20",
        )}
      >
        מדריך לבעלי בתים
      </Link>
    </HelpShell>
  );
}
