"use client";

import { HelpShell, HelpStep } from "@/components/help-shell";
import { useHelpMessages } from "@/hooks/use-help-messages";
import { helpImage } from "@/lib/help-images";

export default function ShareEditCodeHelpPage() {
  const { help } = useHelpMessages();
  const page = help.shareEditCode;

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
            image={index === 2 ? helpImage("share-edit-code-dialog.png") : undefined}
            imageAlt={"imageAlt" in step ? step.imageAlt : undefined}
          />
        ))}
      </ol>
    </HelpShell>
  );
}
