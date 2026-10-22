"use client";

import { useEffect, useState } from "react";
import { HelpExpandable, HelpShell, HelpStep } from "@/components/help-shell";
import { HelpText } from "@/lib/render-help-text";
import { helpImage } from "@/lib/help-images";
import {
  ANDROID_INSTALL_DOWNLOAD_HIGHLIGHT,
  ANDROID_PLAY_PROTECT_DETAILS_HIGHLIGHT,
  IOS_INSTALL_ADD_CONFIRM_HIGHLIGHT,
  IOS_INSTALL_ADD_HOME_HIGHLIGHT,
  IOS_INSTALL_SHARE_HIGHLIGHT,
  type HelpShotHighlight,
} from "@/lib/help-shot-highlight";
import { isAndroidDevice, isIosDevice } from "@/lib/push-client";

function installHelpImage(name: string) {
  return helpImage(`install/${name}`);
}

const IPHONE_STEPS = [
  {
    title: "לחצו שיתוף",
    body: "ב-Safari, בסרגל התחתון — כפתור שיתוף (חץ למעלה מריבוע).",
    image: installHelpImage("ios-2-share-photo.jpg"),
    imageHighlight: IOS_INSTALL_SHARE_HIGHLIGHT,
    imageAlt: "כפתור שיתוף בסафari",
  },
  {
    title: "הוספה למסך הבית",
    body: "גללו ובחרו **הוספה למסך הבית** בתפריט השיתוף.",
    image: installHelpImage("ios-3-add-home-photo.png"),
    imageHighlight: IOS_INSTALL_ADD_HOME_HIGHLIGHT,
    imageAlt: "הוספה למסך הבית בתפריט השיתוף",
  },
  {
    title: "אישור",
    body: "לחצו **הוסף** (Add) למעלה מימין. האייקון יופיע במסך הבית.",
    image: installHelpImage("ios-4-add-confirm-photo.jpg"),
    imageHighlight: IOS_INSTALL_ADD_CONFIRM_HIGHLIGHT,
    imageAlt: "מסך אישור — הוסף למסך הבית",
  },
] as const;

const ANDROID_STEPS = [
  {
    title: "התקנת האפליקציה",
    body: "ב-**Chrome** — לחצו **הורדה** בראש המסך ואשרו.",
    imageFirst: true,
    image: installHelpImage("android-2-install.jpg"),
    imageHighlight: ANDROID_INSTALL_DOWNLOAD_HIGHLIGHT,
    imageAlt: "כפתור התקנת האפליקציה ב-Chrome",
  },
] as const;

function PlatformSteps({
  steps,
}: {
  steps: readonly {
    title: string;
    body: string;
    issueNote?: string;
    imageFirst?: boolean;
    image: string;
    imageAlt: string;
    imageHighlight?: HelpShotHighlight;
  }[];
}) {
  return (
    <ol className="space-y-3">
      {steps.map((step, index) => (
        <HelpStep
          key={step.title}
          n={index + 1}
          title={step.title}
          body={step.body}
          issueNote={step.issueNote}
          imageFirst={step.imageFirst}
          image={step.image}
          imageAlt={step.imageAlt}
          imageHighlight={step.imageHighlight}
        />
      ))}
    </ol>
  );
}

function AndroidInstallSection() {
  return (
    <div className="space-y-4">
      <p className="text-base leading-relaxed text-violet-200/90">
        <HelpText>
          {
            "בטלפונים חדשים Google Play Protect לפעמים חוסם אחרי ההתקנה — זה לא באג באתר; ראו **פתרון** למטה."
          }
        </HelpText>
      </p>
      <PlatformSteps steps={ANDROID_STEPS} />
      <HelpExpandable title="Google Play Protect חוסם?" subtitle="פתרון" defaultOpen={false}>
        <ul className="space-y-3">
          <HelpStep
            variant="tip"
            hideTitle
            body="Google עלול להציג **אפליקציה לא בטוחה נחסמה**. לחצו **פרטים נוספים**, ואז **הבנתי**. אם זה חוזר — מחקו את HallowHood מהגדרות → אפליקציות ונסו שוב מכפתור ההתקנה."
            image={installHelpImage("android-play-protect.jpg")}
            imageHighlight={ANDROID_PLAY_PROTECT_DETAILS_HIGHLIGHT}
            imageAlt="Google Play Protect — אפליקציה לא בטוחה נחסמה"
          />
        </ul>
      </HelpExpandable>
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
        <HelpText>{"התקנה = הוספה למסך הבית."}</HelpText>
      </p>
      <div className="space-y-3">
        <HelpExpandable title="אייפון" subtitle="Safari בלבד" defaultOpen={iphoneDefaultOpen}>
          <PlatformSteps steps={IPHONE_STEPS} />
        </HelpExpandable>
        <HelpExpandable title="אנדרואיד" subtitle="Chrome מומלץ" defaultOpen={androidDefaultOpen}>
          <AndroidInstallSection />
        </HelpExpandable>
      </div>
    </HelpShell>
  );
}
