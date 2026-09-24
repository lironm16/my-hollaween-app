"use client";

import { HelpExpandable, HelpShell, HelpStep } from "@/components/help-shell";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { helpImage } from "@/lib/help-images";

const IPHONE_STEPS = [
  {
    title: "לחצו שיתוף",
    body: "ב-Safari, בסרגל התחתון — כפתור השיתוף (חץ למעלה מריבוע).",
    image: helpImage("install/ios-2-share.png"),
    imageAlt: "כפתור שיתוף בסафari",
  },
  {
    title: "הוספה למסך הבית",
    body: "גללו ובחרו «הוספה למסך הבית» → «הוסף». האייקון יופיע במסך הבית.",
    image: helpImage("install/ios-3-add-home.png"),
    imageAlt: "הוספה למסך הבית בתפריט השיתוף",
  },
] as const;

const ANDROID_STEPS = [
  {
    title: "פתחו ב-Chrome",
    body: "גלשו לאתר ב-Chrome (מומלץ).",
    image: helpImage("install/android-1-app.png"),
    imageAlt: "האפליקציה ב-Chrome באנדרואיד",
  },
  {
    title: "אישור התקנה",
    body: "לחצו «הוסף» או «התקן» בחלון שיופיע אחרי הכפתור.",
    image: helpImage("install/android-3-confirm.png"),
    imageAlt: "אישור התקנת האפליקציה",
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

function AndroidInstallSection() {
  return (
    <div className="space-y-4">
      <p className="text-base leading-relaxed text-violet-200/90">
        ב-Chrome לחצו על כפתור «התקנת האפליקציה» בראש המסך (סמל ההורדה ליד תפריט ☰), או
        על הכפתור כאן:
      </p>
      <PwaInstallButton variant="prominent" showAlways />
      <PlatformSteps steps={ANDROID_STEPS} />
    </div>
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
          <AndroidInstallSection />
        </HelpExpandable>
      </div>
    </HelpShell>
  );
}
