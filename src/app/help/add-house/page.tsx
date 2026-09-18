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
        לחצו שמירה. הקוד נשמר במכשיר — אפשר לערוך בלי להקליד שוב. אפשר לשתף; אחרי הזנה פעם אחת נשמר גם
        אצלם.{" "}
        <Link href="/help/edit-code" className="text-orange-300 underline underline-offset-2">
          איבדתם את הקוד?
        </Link>
      </>
    ),
    image: "/help/step-3-done.png",
    imageAlt: "מסך הצלחה עם קוד עריכה",
  },
];

export default function AddHouseGuidePage() {
  return (
    <HelpShell title="איך מוסיפים בית?">
      <ol className="space-y-3">
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
        href="/add"
        className={cn(buttonVariants(), "mt-4 block w-full bg-orange-500 text-center text-black hover:bg-orange-400")}
      >
        לטופס הוספה
      </Link>
    </HelpShell>
  );
}
