"use client";

import Link from "next/link";
import { HelpShell, HelpStep } from "@/components/help-shell";
import { helpImage } from "@/lib/help-images";
import { GEM_ALBUM_TITLE_HE } from "@/lib/gem-album-copy";
import { GEM_ACTION_FIND_HE, GEM_GAME_TITLE_HE } from "@/lib/gem-hunt-copy";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "דף הבית",
    body: "מהמפה — לחצו על הבית ופתחו את **דף הבית** (שיתוף / כרטיס מלא). למעלה מפה קטנה, מתחת פרטי הבית ואז בלוק **שדון נסתר**.",
    image: helpImage("gem/gem-find-1-map-sheet.png"),
    imageAlt: "דף בית עם מפה וכרטיס",
  },
  {
    title: "כרטיס הבית — בלוק השדון",
    body: `אפשר גם לפתוח את **דף הבית** (קישור שיתוף / כרטיס מלא). למטה מופיע בלוק **${GEM_GAME_TITLE_HE}**: מרחק, סטטוס «בטווח — אפשר למצוא», וכפתור **התחילו מפגש** (או **פתחו מצלמה**). צריך **כתובת גלויה** — אותו כלל כמו לראות את הרחוב.`,
    image: helpImage("gem/gem-find-2-house-panel.png"),
    imageAlt: "בלוק שדון נסתר בכרטיס הבית",
  },
  {
    title: "פתיחת המצלמה",
    body: "**התקרבו** לנקודה על המדרכה ליד הבית (עדכנו GPS בחוץ). לחצו **התחילו מפגש** — המצלמה נפתחת, מסתובבים ומחפשים את החיה. אין מצלמה? השתמשו ב**גלה לי** בתוך המסך (מדריך מלא ב**משחק השדונים**).",
    image: helpImage("gem/gem-find-3-camera-btn.png"),
    imageAlt: "כפתור התחלת מפגש במצלמה",
  },
  {
    title: "מציאה ואלבום",
    body: `כשהשדון במסגרת — לחצו עליו. אחרי «מצאת שדון!» הוא נוסף ל**${GEM_ALBUM_TITLE_HE}** (תפריט ☰).`,
    image: helpImage("gem/gem-find-4-camera-hunt.png"),
    imageAlt: "מסך ציד במצלמה",
  },
] as const;

export default function GemFindAtHouseHelpPage() {
  return (
    <HelpShell title={`${GEM_ACTION_FIND_HE} — בבית ספציפי`} backHref="/help">
      <p className="mb-4 text-lg leading-relaxed text-violet-100">
        מדריך למבקרים: איך מגיעים מבית במפה למפגש במצלמה. אם **משחק השדונים** כבוי בהגדרות — הבלוק לא יופיע
        (מנהלים רואים תמיד לבדיקות).
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
          href="/help/gem-hunt"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "w-full border-orange-400/50 bg-orange-500/10 text-lg text-orange-100 hover:bg-orange-500/20",
          )}
        >
          {GEM_GAME_TITLE_HE} — רמז, גלה לי, בעיות
        </Link>
        <Link href="/help" className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "w-full")}>
          חזרה לכל השאלות
        </Link>
      </div>
    </HelpShell>
  );
}
