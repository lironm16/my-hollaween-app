"use client";

import { useEffect, useState } from "react";
import { HelpExpandable, HelpShell, HelpStep } from "@/components/help-shell";
import { HelpText } from "@/lib/render-help-text";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { helpImage } from "@/lib/help-images";
import { isAndroidDevice, isIosDevice } from "@/lib/push-client";

function installHelpImage(name: string) {
  return helpImage(`install/${name}.png`);
}

const IPHONE_STEPS = [
  {
    title: "לחצו שיתוף",
    body: "ב-Safari, בסרגל התחתון — כפתור <<שיתוף>> (חץ למעלה מריבוע).",
    image: installHelpImage("ios-2-share"),
    imageAlt: "כפתור שיתוף בסафari",
  },
  {
    title: "הוספה למסך הבית",
    body: "גללו ובחרו <<הוספה למסך הבית>> → <<הוסף>>. האייקון יופיע במסך הבית.",
    image: installHelpImage("ios-3-add-home"),
    imageAlt: "הוספה למסך הבית בתפריט השיתוף",
  },
] as const;

const ANDROID_STEPS = [
  {
    title: "כפתור ההורדה בראש המסך",
    body: "ב-Chrome, ליד תפריט ☰ — סמל ההורדה (↓) בראש המסך (אותו כפתור כמו באפליקציה).",
    image: installHelpImage("android-1-app"),
    imageAlt: "כפתור התקנה בראש האפליקציה ליד התפריט",
  },
  {
    title: "אישור התקנה",
    body: "לחצו <<הוסף>> או <<התקן>> בחלון שיופיע אחרי הכפתור.",
    image: installHelpImage("android-3-confirm"),
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

function AndroidInstallSection({ showInstallButton }: { showInstallButton: boolean }) {
  return (
    <div className="space-y-4">
      {showInstallButton ? (
        <PwaInstallButton variant="prominent" showAlways />
      ) : null}
      <p className="text-base leading-relaxed text-violet-200/90">
        <HelpText>
          {
            "ב-Chrome באנדרואיד אפשר גם ללחוץ על סמל ההורדה (↓) בראש המסך, ליד תפריט ☰ — ראו שלב 1 למטה."
          }
        </HelpText>
      </p>
      <PlatformSteps steps={ANDROID_STEPS} />
    </div>
  );
}

function useInstallHelpPlatform() {
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");

  useEffect(() => {
    if (isIosDevice()) setPlatform("ios");
    else if (isAndroidDevice()) setPlatform("android");
    else setPlatform("other");
  }, []);

  return platform;
}

export default function InstallHelpPage() {
  const platform = useInstallHelpPlatform();
  const iphoneDefaultOpen = platform === "ios" || platform === "other";
  const androidDefaultOpen = platform === "android";

  return (
    <HelpShell title="איך מתקינים את האפליקציה?">
      <p className="mb-4 text-lg leading-relaxed text-orange-50">
        <HelpText>
          {"<<התקנה>> = הוספה למסך הבית. פתחו פעם אחת ברשת כדי שהמפה תישמר בטלפון."}
        </HelpText>
      </p>
      <div className="space-y-3">
        <HelpExpandable title="אייפון" subtitle="Safari בלבד" defaultOpen={iphoneDefaultOpen}>
          <PlatformSteps steps={IPHONE_STEPS} />
        </HelpExpandable>
        <HelpExpandable title="אנדרואיד" subtitle="Chrome מומלץ" defaultOpen={androidDefaultOpen}>
          <AndroidInstallSection showInstallButton={platform === "android"} />
        </HelpExpandable>
      </div>
    </HelpShell>
  );
}
