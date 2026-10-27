"use client";

import Link from "next/link";
import { HelpShell, HelpStep } from "@/components/help-shell";
import { useHelpMessages } from "@/hooks/use-help-messages";
import { helpImage } from "@/lib/help-images";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEP_IMAGES = [
  helpImage("step-1-menu.png"),
  helpImage("step-2-form.png"),
  helpImage("step-3-details.png"),
  helpImage("step-3-done.png"),
] as const;

export default function AddHouseGuidePage() {
  const { help } = useHelpMessages();
  const page = help.addHouse;

  return (
    <HelpShell title={page.title}>
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
              index === page.steps.length - 1 ? (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/help/share-edit-code"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "lg" }),
                      "w-full border-orange-400/50 bg-orange-500/10 text-lg text-orange-100 hover:bg-orange-500/20",
                    )}
                  >
                    {page.linkShareCode}
                  </Link>
                  <Link
                    href="/help/edit-code"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "lg" }),
                      "w-full border-orange-400/50 bg-orange-500/10 text-lg text-orange-100 hover:bg-orange-500/20",
                    )}
                  >
                    {page.linkLostCode}
                  </Link>
                </div>
              ) : undefined
            }
          />
        ))}
      </ol>
      <Link
        href="/add"
        className={cn(
          buttonVariants({ size: "lg" }),
          "mt-5 block w-full bg-orange-500 text-center text-lg text-black hover:bg-orange-400",
        )}
      >
        {page.ctaForm}
      </Link>
    </HelpShell>
  );
}
