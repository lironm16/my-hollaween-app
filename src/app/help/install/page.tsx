"use client";

import { useEffect, useState } from "react";
import { HelpExpandable, HelpShell, HelpStep } from "@/components/help-shell";
import { HelpText } from "@/lib/render-help-text";
import { helpImage } from "@/lib/help-images";
import {
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
    title: "פתחו ב-Chrome",
    body: "השתמשו ב-Google Chrome (לא Samsung Internet). אם HallowHood כבר מותקנת ו-Google חוסם — מחקו אותה מהגדרות → אפליקציות.",
    image: installHelpImage("android-1-app.jpg"),
    imageAlt: "HallowHood ב-Chrome",
  },
  {
    title: "התקנת האפליקציה",
    body: "לחצו על **התקנת האפליקציה** (אייקון ההורדה בראש המסך) ואשרו בהתקנה.",
    image: installHelpImage("android-1-app.jpg"),
    imageAlt: "כפתור התקנת האפליקציה ב-Chrome",
  },
] as const;

function PlatformSteps({
  steps,
}: {
  steps: readonly {
    title: string;
    body: string;
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
            "באנדרואיד: התקינו דרך כפתור **התקנת האפליקציה** בראש המסך (Chrome). בטלפונים חדשים Google Play Protect לפעמים חוסם — זה לא באג באתר; ראו **פתרון** למטה."
          }
        </HelpText>
      </p>
      <PlatformSteps steps={ANDROID_STEPS} />
      <HelpExpandable title="Google Play Protect חוסם?" subtitle="פתרון" defaultOpen={false}>
        <ul className="space-y-3">
          <HelpStep
            variant="tip"
            title="אחרי **התקנת אפל**"
            body="Google עלול להציג **אפליקציה לא בטוחה נחסמה**. לחצו **הבנתי**. אם זה חוזר — מחקו את HallowHood מהגדרות → אפליקציות ונסו שוב מכפתור ההתקנה."
            image={installHelpImage("android-play-protect.jpg")}
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
