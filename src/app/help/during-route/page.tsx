"use client";

import Link from "next/link";
import { HelpShell, HelpStep } from "@/components/help-shell";
import { useHelpMessages } from "@/hooks/use-help-messages";
import { helpImage } from "@/lib/help-images";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEP_IMAGES = [
  helpImage("route-during-exit.png"),
  helpImage("route-during-map.png"),
  helpImage("route-during-actions.png"),
  helpImage("route-during-exit.png"),
] as const;

export default function DuringRouteHelpPage() {
  const { help } = useHelpMessages();
  const page = help.duringRoute;

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
          />
        ))}
      </ol>
      <Link
        href="/help/create-route"
        className={cn(
          buttonVariants({ variant: "outline", size: "lg" }),
          "mt-5 block w-full border-orange-400/50 bg-orange-500/10 text-center text-lg text-orange-100 hover:bg-orange-500/20",
        )}
      >
        {page.linkCreate}
      </Link>
    </HelpShell>
  );
}
