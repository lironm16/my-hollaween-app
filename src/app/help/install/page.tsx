"use client";

import { HelpShell, HelpStep } from "@/components/help-shell";

const IPHONE_STEPS = [
  {
    title: "פתחו ב-Safari",
    body: "גלשו לאתר האפליקציה בדפדפן Safari (לא Chrome).",
    image: "/help/install/ios-1-app.png",
    imageAlt: "האפליקציה ב-Safari באייפון",
  },
  {
    title: "לחצו שיתוף",
    body: "בסרגל התחתון — כפתור השיתוף (חץ למעלה מריבוע).",
    image: "/help/install/ios-2-share.png",
    imageAlt: "כפתור שיתוף בסафari",
  },
  {
    title: "הוספה למסך הבית",
    body: "גללו ובחרו «הוספה למסך הבית» → «הוסף». האייקון יופיע במסך הבית.",
    image: "/help/install/ios-3-add-home.png",
    imageAlt: "הוספה למסך הבית בתפריט השיתוף",
  },
] as const;

const ANDROID_STEPS = [
  {
    title: "פתחו ב-Chrome",
    body: "גלשו לאתר ב-Chrome (מומלץ).",
    image: "/help/install/android-1-app.png",
    imageAlt: "האפליקציה ב-Chrome באנדרואיד",
  },
  {
    title: "תפריט ⋮",
    body: "לחצו שלוש נקודות למעלה מימין.",
    image: "/help/install/android-2-menu.png",
    imageAlt: "תפריט Chrome עם הוסף למסך הבית",
  },
  {
    title: "אישור הוספה",
    body: "בחרו «הוסף למסך הבית» או «התקן אפליקציה» → «הוסף».",
    image: "/help/install/android-3-confirm.png",
    imageAlt: "אישור הוספה למסך הבית",
  },
] as const;

function PlatformGuide({
  title,
  subtitle,
  steps,
}: {
  title: string;
  subtitle: string;
  steps: readonly { title: string; body: string; image: string; imageAlt: string }[];
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold text-orange-200">{title}</h2>
        <p className="mt-1 text-base text-orange-100/90">{subtitle}</p>
      </div>
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
    </section>
  );
}

export default function InstallHelpPage() {
  return (
    <HelpShell title="איך מתקינים את האפליקציה?">
      <p className="mb-5 text-base text-orange-50">
        «התקנה» = הוספה למסך הבית. פתחו פעם אחת ברשת כדי שהמפה תישמר בטלפון.
      </p>
      <div className="space-y-8">
        <PlatformGuide title="אייפון" subtitle="Safari בלבד" steps={IPHONE_STEPS} />
        <PlatformGuide title="אנדרואיד" subtitle="Chrome מומלץ" steps={ANDROID_STEPS} />
      </div>
    </HelpShell>
  );
}
