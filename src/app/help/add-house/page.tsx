"use client";

import Link from "next/link";
import { HelpShell, HelpStep } from "@/components/help-shell";
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
    title: "פתחו הוספה",
    body: "תפריט ☰ → בית → הוספה.",
    image: "/help/step-1-menu.png",
    imageAlt: "תפריט עם כפתור הוספה",
  },
  {
    title: "שם וכתובת",
    body: "שם הבית וכתובת אמיתית מהרשימה.",
    image: "/help/step-2-form.png",
    imageAlt: "שם וכתובת בטופס",
  },
  {
    title: "שעות, ממתקים, פחד",
    body: "שעות ב־31 באוקטובר, רמת פחד, וממתקים — לפחות קישוטים או ממתקים.",
    image: "/help/step-3-details.png",
    imageAlt: "שעות, ממתקים ורמת פחד",
  },
  {
    title: "שמירה וקוד",
    body: (
      <>
        לחצו <strong className="text-orange-200">שמירה</strong>. מופיע{" "}
        <strong className="text-orange-200">קוד עריכה</strong> — 6 ספרות שמאפשרות לעדכן את הבית
        (שעות, ממתקים, תמונה). במכשיר שבו הוספתם הקוד נשמר — אפשר לערוך בלי להקליד שוב. אפשר
        לשתף עם בני משפחה; אחרי הזנה פעם אחת נשמר גם אצלם.
      </>
    ),
    image: "/help/step-3-done.png",
    imageAlt: "מסך הצלחה עם קוד עריכה",
    action: (
      <Link
        href="/help/edit-code"
        className={cn(
          buttonVariants({ variant: "outline", size: "lg" }),
          "w-full border-orange-400/50 bg-orange-500/10 text-base text-orange-100 hover:bg-orange-500/20",
        )}
      >
        איבדתם את קוד העריכה?
      </Link>
    ),
  },
];

export default function AddHouseGuidePage() {
  return (
    <HelpShell title="איך מוסיפים בית?">
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
      <Link
        href="/add"
        className={cn(
          buttonVariants({ size: "lg" }),
          "mt-5 block w-full bg-orange-500 text-center text-base text-black hover:bg-orange-400",
        )}
      >
        לטופס הוספה
      </Link>
    </HelpShell>
  );
}
