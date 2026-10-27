"use client";

import { HelpShell } from "@/components/help-shell";
import { useHelpMessages } from "@/hooks/use-help-messages";
import { useLocale } from "@/hooks/use-locale";
import { renderHelpText } from "@/lib/render-help-text";

function Steps({ steps, dir }: { steps: readonly string[]; dir: "ltr" | "rtl" }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, index) => (
        <li key={step} className="flex gap-3">
          <span
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-lg font-bold text-black"
            aria-hidden
          >
            {index + 1}
          </span>
          <span className="pt-1 text-lg leading-relaxed text-orange-50">
            {renderHelpText(step, { dir })}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function ScanVisitHelpPage() {
  const { dir } = useLocale();
  const { help } = useHelpMessages();
  const page = help.scanVisit;

  return (
    <HelpShell title={page.title}>
      <div className="space-y-5">
        <section className="space-y-4 rounded-2xl bg-[#1d1028] p-5 ring-1 ring-orange-500/25">
          <h2 className="text-xl font-semibold text-orange-200">{page.visitorHeading}</h2>
          <Steps steps={page.visitorSteps} dir={dir} />
          <p className="text-base leading-relaxed text-violet-200">
            {renderHelpText(page.visitorFootnote, { dir })}
          </p>
        </section>
        <section className="space-y-4 rounded-2xl bg-[#1d1028] p-5 ring-1 ring-orange-500/25">
          <h2 className="text-xl font-semibold text-orange-200">{page.ownerHeading}</h2>
          <Steps steps={page.ownerSteps} dir={dir} />
          <div className="space-y-2 rounded-xl border border-orange-500/30 bg-orange-950/40 p-3 text-sm leading-relaxed text-orange-200">
            <p>
              <strong>{page.safariBlockTitle}</strong> {renderHelpText(page.safariBlockBody, { dir })}
            </p>
            <p>
              <strong>{page.safariMacTitle}</strong> {renderHelpText(page.safariMacBody, { dir })}
            </p>
          </div>
        </section>
      </div>
    </HelpShell>
  );
}
