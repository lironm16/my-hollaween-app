"use client";

import Link from "next/link";
import { HelpShell, HelpStep } from "@/components/help-shell";
import { useHelpMessages } from "@/hooks/use-help-messages";
import { helpImage } from "@/lib/help-images";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEP_IMAGES = [
  helpImage("route-1-filters.png"),
  helpImage("route-2-origin.png"),
  helpImage("route-3-enable.png"),
  helpImage("route-4-summary.png"),
] as const;

export default function CreateRouteHelpPage() {
  const { help } = useHelpMessages();
  const page = help.createRoute;

  return (
    <HelpShell title={page.title}>
      <p className="mb-4 text-lg leading-relaxed text-violet-100">{page.intro}</p>
      <ol className="space-y-4">
        {page.steps.map((step, index) => (
          <HelpStep
            key={step.title}
            n={index + 1}
            title={step.title}
            body={step.body}
            image={STEP_IMAGES[index]}
            imageAlt={step.imageAlt}
            action={
              index === 0 ? (
                <Link
                  href="/help/filter"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "w-full border-orange-400/50 bg-orange-500/10 text-lg text-orange-100 hover:bg-orange-500/20",
                  )}
                >
                  {page.linkFilterGuide}
                </Link>
              ) : undefined
            }
          />
        ))}
      </ol>
      <p className="mt-5 text-center text-lg text-violet-200">
        <Link href="/help/during-route" className="text-orange-300 underline underline-offset-2 hover:text-orange-200">
          {page.linkDuringRoute}
        </Link>
      </p>
    </HelpShell>
  );
}
