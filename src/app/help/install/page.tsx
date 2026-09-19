"use client";

import { HelpExpandable, HelpShell, HelpStep } from "@/components/help-shell";
import { helpImage } from "@/lib/help-images";

const IPHONE_STEPS = [
  {
    title: "לחצו שיתוף",
    body: "ב-Safari, בסרגל התחתון — כפתור השיתוף (חץ למעלה מריבוע).",
    image: helpImage("install/ios-2-share.svg"),
    imageAlt: "כפתור שיתוף בסафari",
  },
  {
    title: "הוספה למסך הבית",
    body: "גללו ובחרו «הוספה למסך הבית» → «הוסף». האייקון יופיע במסך הבית.",
    image: helpImage("install/ios-3-add-home.svg"),
    imageAlt: "הוספה למסך הבית בתפריט השיתוף",
  },
] as const;

const ANDROID_STEPS = [
  {
    title: "פתחו ב-Chrome",
    body: "גלשו לאתר ב-Chrome (מומלץ).",
    image: helpImage("install/android-1-app.svg"),
    imageAlt: "האפליקציה ב-Chrome באנדרואיד",
  },
  {
    title: "תפריט ⋮",
    body: "לחצו שלוש נקודות למעלה מימין.",
    image: helpImage("install/android-2-menu.svg"),
    imageAlt: "תפריט Chrome עם הוסף למסך הבית",
  },
  {
    title: "אישור הוספה",
    body: "בחרו «הוסף למסך הבית» או «התקן אפליקציה» → «הוסף».",
    image: helpImage("install/android-3-confirm.svg"),
    imageAlt: "אישור הוספה למסך הבית",
  },
] as const;

function PlatformSteps({
  steps,
}: {
  steps: readonly { title: string; body: string; image: string; imageAlt: string }[];
}) {
  return (
    <ol className="space-y-3">
      {steps.map((step, index) => (
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
  );
}

export default function InstallHelpPage() {
  return (
    <HelpShell title="איך מתקינים את האפליקציה?">
      <p className="mb-4 text-lg leading-relaxed text-orange-50">
        «התקנה» = הוספה למסך הבית. פתחו פעם אחת ברשת כדי שהמפה תישמר בטלפון.
      </p>
      <div className="space-y-3">
        <HelpExpandable title="אייפון" subtitle="Safari בלבד">
          <PlatformSteps steps={IPHONE_STEPS} />
        </HelpExpandable>
        <HelpExpandable title="אנדרואיד" subtitle="Chrome מומלץ">
          <PlatformSteps steps={ANDROID_STEPS} />
        </HelpExpandable>
      </div>
    </HelpShell>
  );
}
