"use client";

import { useEffect, useState } from "react";
import { HelpExpandable, HelpShell, HelpStep } from "@/components/help-shell";
import { HelpText } from "@/components/help-text";
import { useHelpMessages } from "@/hooks/use-help-messages";
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
  const { help } = useHelpMessages();
  const page = help.install;
  const androidStep = page.androidSteps[0];

  const androidSteps = [
    {
      ...androidStep,
      imageFirst: true as const,
      image: installHelpImage("android-2-install.jpg"),
      imageHighlight: ANDROID_INSTALL_DOWNLOAD_HIGHLIGHT,
    },
  ];

  return (
    <div className="space-y-3">
      <PlatformSteps steps={androidSteps} />
      <HelpExpandable title={page.playProtectTitle} subtitle={page.playProtectSubtitle} defaultOpen={false}>
        <ul className="space-y-3">
          <HelpStep variant="tip" hideTitle body={page.playProtectTip1} />
          <HelpStep
            variant="tip"
            hideTitle
            body={page.playProtectTip2}
            image={installHelpImage("android-play-protect.jpg")}
            imageHighlight={ANDROID_PLAY_PROTECT_DETAILS_HIGHLIGHT}
            imageAlt={page.playProtectImageAlt}
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
  const { help } = useHelpMessages();
  const page = help.install;

  const iphoneDefaultOpen = platform === "ios" || platform === "other";
  const androidDefaultOpen = platform === "android";

  const iphoneSteps = page.iphoneSteps.map((step, index) => {
    const images = [
      { file: "ios-2-share-photo.jpg", highlight: IOS_INSTALL_SHARE_HIGHLIGHT },
      { file: "ios-3-add-home-photo.png", highlight: IOS_INSTALL_ADD_HOME_HIGHLIGHT },
      { file: "ios-4-add-confirm-photo.jpg", highlight: IOS_INSTALL_ADD_CONFIRM_HIGHLIGHT },
    ] as const;
    const spec = images[index];
    return {
      ...step,
      image: installHelpImage(spec.file),
      imageHighlight: spec.highlight,
    };
  });

  return (
    <HelpShell title={page.title}>
      <p className="mb-4 text-lg leading-relaxed text-orange-50">
        <HelpText>{page.intro}</HelpText>
      </p>
      <div className="space-y-3">
        <HelpExpandable title={page.iphoneSectionTitle} subtitle={page.iphoneSectionSubtitle} defaultOpen={iphoneDefaultOpen}>
          <PlatformSteps steps={iphoneSteps} />
        </HelpExpandable>
        <HelpExpandable title={page.androidSectionTitle} subtitle={page.androidSectionSubtitle} defaultOpen={androidDefaultOpen}>
          <AndroidInstallSection />
        </HelpExpandable>
      </div>
    </HelpShell>
  );
}
