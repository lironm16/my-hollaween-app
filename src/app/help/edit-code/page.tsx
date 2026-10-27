"use client";

import { HelpShell, HelpShot } from "@/components/help-shell";
import { useHelpMessages } from "@/hooks/use-help-messages";
import { helpImage } from "@/lib/help-images";

export default function EditCodeHelpPage() {
  const { help } = useHelpMessages();
  const page = help.editCode;

  return (
    <HelpShell title={page.title}>
      <div className="space-y-4 rounded-2xl bg-[#1d1028] p-5 ring-1 ring-orange-500/25">
        <p className="text-lg leading-relaxed text-orange-50">{page.p1}</p>
        <p className="text-lg leading-relaxed text-orange-100">
          {page.p2Before}
          <strong className="text-orange-200">{page.p2Strong}</strong>
          {page.p2After}
        </p>
        <HelpShot src={helpImage("step-3-done.png")} alt={page.imageAlt} />
      </div>
    </HelpShell>
  );
}
