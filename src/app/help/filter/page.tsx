"use client";

import Link from "next/link";
import { HelpShell, HelpStep } from "@/components/help-shell";
import { useHelpMessages } from "@/hooks/use-help-messages";
import { helpImage } from "@/lib/help-images";

const STEP_IMAGES = [
  helpImage("filter-1-open.png"),
  helpImage("filter-2-map-dim.png"),
  helpImage("filter-3-custom-times.png"),
  helpImage("filter-4-results.png"),
] as const;

export default function FilterHelpPage() {
  const { help } = useHelpMessages();
  const page = help.filter;

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
      <p className="mt-5 text-center text-lg text-violet-200">
        <Link
          href="/help/create-route"
          className="text-orange-300 underline underline-offset-2 hover:text-orange-200"
        >
          {page.linkCreateRoute}
        </Link>
      </p>
    </HelpShell>
  );
}
