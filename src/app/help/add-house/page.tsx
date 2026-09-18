"use client";

import Link from "next/link";
import { HelpShell, HelpStep } from "@/components/help-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "פתחו הוספה",
    body: "תפריט ☰ → בית → הוספה.",
    image: "/help/step-1-menu.png",
    imageAlt: "תפריט עם כפתור הוספה",
  },
  {
    title: "מלאו ושמרו",
    body: "שם, כתובת מהרשימה, שעות — ולחצו שמירה. תמונת קישוט אפשר גם אחר כך.",
    image: "/help/step-2-form.png",
    imageAlt: "טופס הוספת בית",
  },
  {
    title: "שמרו את הקוד",
    body: "העתיקו את קוד העריכה — בלי זה אי אפשר לערוך מטלפון אחר.",
    image: "/help/step-3-done.png",
    imageAlt: "מסך הצלחה עם קוד עריכה",
  },
] as const;

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
