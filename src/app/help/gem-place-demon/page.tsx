"use client";

import Link from "next/link";
import { HelpShell, HelpStep } from "@/components/help-shell";
import { helpImage } from "@/lib/help-images";
import {
  GEM_PLACE_ACTION_HE,
  GEM_PLACE_HINT_HE,
  GEM_PLACE_SAVE_HE,
  GEM_GAME_TITLE_HE,
} from "@/lib/gem-hunt-copy";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: `פתיחת ${GEM_PLACE_ACTION_HE}`,
    body: "**בעל/ת הבית** (קוד עריכה במכשיר) או **מנהל/ת**. דף הבית או **הבית שלי** → **פעולות** (⋮) → **מיקום השדון**. השמירה בשרת — לכל המבקרים.",
    image: helpImage("gem/gem-place-1-menu.png"),
    imageAlt: "תפריט פעולות עם מיקום השדון",
  },
  {
    title: "מיקום בחוץ, נגיש לכולם",
    body: GEM_PLACE_HINT_HE,
    image: helpImage("gem/gem-place-2-editor.png"),
    imageAlt: "מפת מיקום השדון עם סימון במרכז",
  },
  {
    title: "שמירה ואיפוס",
    body: `גררו את הסימון במפה, השתמשו בחצים או ב**המיקום שלי** (עמדו בנקודה הרצויה בחוץ). לחצו **${GEM_PLACE_SAVE_HE}** — כולם יראו את הנקודה החדשה. **אפס** מחזיר למיקום האוטומטי ליד הבית.`,
    image: helpImage("gem/gem-place-3-footer.png"),
    imageAlt: "כפתורי שמירה ואיפוס מתחת למפה",
  },
] as const;

export default function GemPlaceDemonHelpPage() {
  return (
    <HelpShell title={`${GEM_PLACE_ACTION_HE} — בעלי בתים`} backHref="/help">
      <p className="mb-4 text-lg leading-relaxed text-violet-100">
        כך מכוונים **איפה** על המדרכה/בחצר מופיע השדון במצלמה — לפני שפותחים את {GEM_GAME_TITLE_HE} לציבור.
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
      <div className="mt-6 flex flex-col gap-2">
        <Link
          href="/help/gem-find-at-house"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "w-full border-orange-400/50 bg-orange-500/10 text-lg text-orange-100 hover:bg-orange-500/20",
          )}
        >
          איך מבקרים מוצאים שדון בבית?
        </Link>
        <Link
          href="/help/event-device-owner"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}
        >
          קוד עריכה ומכשירים
        </Link>
      </div>
    </HelpShell>
  );
}
