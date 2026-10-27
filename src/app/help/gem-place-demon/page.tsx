"use client";

import Link from "next/link";
import { HelpShell, HelpStep } from "@/components/help-shell";
import { HelpText } from "@/components/help-text";
import { useHelpMessages } from "@/hooks/use-help-messages";
import { helpImage } from "@/lib/help-images";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEP_IMAGES = [
  helpImage("gem/gem-place-1-menu.png"),
  helpImage("gem/gem-place-2-editor.png"),
  helpImage("gem/gem-place-3-footer.png"),
] as const;

export default function GemPlaceDemonHelpPage() {
  const { help, fh } = useHelpMessages();
  const page = help.gemPlaceDemon;

  return (
    <HelpShell title={fh(page.title)} backHref="/help">
      <p className="mb-4 text-lg leading-relaxed text-violet-100">
        <HelpText>{fh(page.intro)}</HelpText>
      </p>
      <ol className="space-y-4">
        {page.steps.map((step, index) => (
          <HelpStep
            key={step.title}
            n={index + 1}
            title={fh(step.title)}
            body={fh(step.body)}
            image={STEP_IMAGES[index]}
            imageAlt={step.imageAlt}
          />
        ))}
      </ol>
      <div className="mt-6">
        <Link href="/help/event-device-owner" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}>
          {page.linkEventDevice}
        </Link>
      </div>
    </HelpShell>
  );
}
