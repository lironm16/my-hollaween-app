"use client";

import Link from "next/link";
import { HelpShell, HelpStep } from "@/components/help-shell";
import { useHelpMessages } from "@/hooks/use-help-messages";
import { helpImage } from "@/lib/help-images";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEP_IMAGES = [
  helpImage("event-device-owner-dialog.png"),
  helpImage("event-device-owner-menu.png"),
  helpImage("event-device-owner-devices.png"),
  helpImage("event-device-owner-banner.png"),
] as const;

export default function EventDeviceOwnerHelpPage() {
  const { help, fh } = useHelpMessages();
  const page = help.eventDeviceOwner;

  return (
    <HelpShell title={page.title}>
      <div className="mb-5 rounded-2xl bg-orange-500/10 p-4 ring-1 ring-orange-400/30">
        <p className="text-lg leading-relaxed text-orange-50">{fh(page.callout)}</p>
      </div>
      <ol className="space-y-6">
        {page.steps.map((step, i) => (
          <HelpStep
            key={step.title}
            n={i + 1}
            title={step.title}
            body={fh(step.body)}
            image={STEP_IMAGES[i]}
            imageAlt={step.imageAlt}
          />
        ))}
      </ol>
      <Link
        href="/help/event-device-visitor"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "mt-6 w-full border-orange-400/50 bg-orange-500/10 text-lg text-orange-100 hover:bg-orange-500/20",
        )}
      >
        {page.linkVisitor}
      </Link>
    </HelpShell>
  );
}
