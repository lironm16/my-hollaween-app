"use client";

import { HelpExpandable, HelpShell, HelpStep } from "@/components/help-shell";
import { HelpUiChip } from "@/components/help-ui-chip";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { helpImage } from "@/lib/help-images";
import type { ReactNode } from "react";

const IPHONE_STEPS = [
  {
    title: "לחצו שיתוף",
    body: (
      <>
        ב-Safari, בסרגל התחתון — כפתור <HelpUiChip>שיתוף</HelpUiChip> (חץ למעלה מריבוע).
      </>
    ),
    image: helpImage("install/ios-2-share.svg"),
    imageAlt: "כפתור שיתוף בסафari",
  },
  {
    title: "הוספה למסך הבית",
    body: (
      <>
        גללו ובחרו <HelpUiChip>הוספה למסך הבית</HelpUiChip> → <HelpUiChip>הוסף</HelpUiChip>.
        האייקון יופיע במסך הבית.
      </>
    ),
    image: helpImage("install/ios-3-add-home.svg"),
    imageAlt: "הוספה למסך הבית בתפריט השיתוף",
  },
] as const;

const ANDROID_STEPS = [
  {
    title: "כפתור ההורדה בראש המסך",
    body: (
      <>
        ב-Chrome, ליד תפריט ☰ — סמל <HelpUiChip>התקנת האפליקציה</HelpUiChip> (חץ למטה).
      </>
    ),
    image: helpImage("install/android-1-app.svg"),
    imageAlt: "כפתור התקנה בראש האפליקציה ליד התפריט",
  },
  {
    title: "אישור התקנה",
    body: (
      <>
        לחצו <HelpUiChip>הוסף</HelpUiChip> או <HelpUiChip>התקן</HelpUiChip> בחלון שיופיע אחרי
        הכפתור.
      </>
    ),
    image: helpImage("install/android-3-confirm.svg"),
    imageAlt: "אישור התקנת האפליקציה",
  },
] as const;

function PlatformSteps({
  steps,
}: {
  steps: readonly { title: string; body: ReactNode; image: string; imageAlt: string }[];
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
        ב-Chrome לחצו על כפתור <HelpUiChip>התקנת האפליקציה</HelpUiChip> בראש המסך (סמל ההורדה
        ליד תפריט ☰), או על הכפתור כאן:
      </p>
      <PwaInstallButton variant="prominent" showAlways forceVisible />
      <PlatformSteps steps={ANDROID_STEPS} />
    </div>
  );
}

export default function InstallHelpPage() {
  return (
    <HelpShell title="איך מתקינים את האפליקציה?">
      <p className="mb-4 text-lg leading-relaxed text-orange-50">
        <HelpUiChip>התקנה</HelpUiChip> = הוספה למסך הבית. פתחו פעם אחת ברשת כדי שהמפה תישמר בטלפון.
      </p>
      <div className="space-y-3">
        <HelpExpandable title="אייפון" subtitle="Safari בלבד">
          <PlatformSteps steps={IPHONE_STEPS} />
        </HelpExpandable>
        <HelpExpandable title="אנדרואיד" subtitle="Chrome מומלץ" defaultOpen>
          <AndroidInstallSection />
        </HelpExpandable>
      </div>
    </HelpShell>
  );
}
