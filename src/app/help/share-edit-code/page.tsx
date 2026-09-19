"use client";

import { HelpShell, HelpStep } from "@/components/help-shell";

const STEPS = [
  {
    title: "איפה רואים את הקוד?",
    body: "מיד אחרי הוספת בית — במסך «הבית במפה!». אחר כך: פתחו את הבית במפה או ברשימה → ⋮ (פעולות) → «קוד עריכה» — להעתקה או שיתוף.",
    image: "/help/step-3-done.png",
    imageAlt: "מסך הצלחה עם קוד עריכה",
  },
  {
    title: "העתיקו ושלחו",
    body: "לחצו «העתיקו» ליד קוד העריכה (6 ספרות). שלחו בוואטסאפ, הודעה, או בעל פה — זה נותן הרשאת עריכה.",
    image: "/help/step-3-done.png",
    imageAlt: "העתקת קוד עריכה",
  },
  {
    title: "הזנה פעם אחת",
    body: "תפריט → בית → עריכה → בחרו את הבית → הזינו את הקוד → «פתיחה לעריכה». אחר כך הקוד נשמר במכשיר שלהם.",
    image: "/help/share-edit-code-enter.png",
    imageAlt: "הזנת קוד עריכה בדף עריכה",
  },
] as const;

export default function ShareEditCodeHelpPage() {
  return (
    <HelpShell title="איך לשתף קוד עריכה?">
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
    </HelpShell>
  );
}
