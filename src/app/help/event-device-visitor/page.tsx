"use client";

import Link from "next/link";
import { HelpShell, HelpStep } from "@/components/help-shell";
import { useHelpMessages } from "@/hooks/use-help-messages";
import { helpImage } from "@/lib/help-images";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEP_IMAGES = [
  undefined,
  helpImage("event-device-visitor-banner.png"),
  helpImage("event-device-visitor-menu-connect.png"),
  helpImage("event-device-visitor-register.png"),
  helpImage("event-device-visitor-menu.png"),
] as const;

export default function EventDeviceVisitorHelpPage() {
  const { help, fh } = useHelpMessages();
  const page = help.eventDeviceVisitor;

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
            title={fh(step.title)}
            body={fh(step.body)}
            image={STEP_IMAGES[i]}
            imageAlt={"imageAlt" in step ? step.imageAlt : undefined}
          />
        ))}
      </ol>
      <Link
        href="/help/event-device-owner"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "mt-6 w-full border-orange-400/50 bg-orange-500/10 text-lg text-orange-100 hover:bg-orange-500/20",
        )}
      >
        {page.linkOwner}
      </Link>
    </HelpShell>
  );
}
