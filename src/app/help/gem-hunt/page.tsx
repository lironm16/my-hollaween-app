"use client";

import Link from "next/link";
import { HelpExpandable, HelpShell } from "@/components/help-shell";
import { HelpText } from "@/components/help-text";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useAppNow } from "@/hooks/use-app-clock";
import { useGemHuntAdminUi } from "@/hooks/use-gem-admin-ui";
import { useHelpMessages } from "@/hooks/use-help-messages";
import { useLocale } from "@/hooks/use-locale";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function GemHuntHelpPage() {
  const { t } = useLocale();
  const { help, fh } = useHelpMessages();
  const page = help.gemHunt;
  const product = help.product;
  const { admin, ready } = useAdminSession();
  useAppNow();
  const { gemUiVisible: showGemHuntHelp } = useGemHuntAdminUi(admin);

  if (!ready) {
    return (
      <HelpShell title={product.gemGameTitle}>
        <p className="text-base text-violet-300">{t("common.loading")}</p>
      </HelpShell>
    );
  }

  if (!showGemHuntHelp) {
    return (
      <HelpShell title={product.gemGameTitle}>
        <div className="space-y-4 rounded-2xl bg-[#1d1028] p-5 ring-1 ring-orange-500/25">
          <p className="text-lg leading-relaxed text-orange-50">{page.closedMessage}</p>
          <Link href="/help" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "inline-flex")}>
            {page.backToFaq}
          </Link>
        </div>
      </HelpShell>
    );
  }

  return (
    <HelpShell title={product.gemGameTitle}>
      <div className="space-y-3">
        <HelpExpandable title={page.aboutTitle} defaultOpen>
          <div className="space-y-3 text-lg leading-relaxed text-orange-50">
            {page.aboutBody.map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>
                <HelpText>{paragraph}</HelpText>
              </p>
            ))}
          </div>
        </HelpExpandable>

        <HelpExpandable title={page.whereTitle}>
          <ul className="list-disc space-y-2 ps-5 text-lg leading-relaxed text-orange-50">
            {page.whereItems.map((item) => (
              <li key={item.slice(0, 24)}>
                <HelpText>{fh(item)}</HelpText>
              </li>
            ))}
          </ul>
        </HelpExpandable>

        <HelpExpandable title={page.startTitle}>
          <ol className="list-decimal space-y-2 ps-5 text-lg leading-relaxed text-orange-50">
            {page.startSteps.map((step) => (
              <li key={step.slice(0, 24)}>
                <HelpText>{step}</HelpText>
              </li>
            ))}
          </ol>
        </HelpExpandable>

        <HelpExpandable title={page.hintTitle}>
          <div className="space-y-3 text-lg leading-relaxed text-orange-50">
            {page.hintParagraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>
                <HelpText>{paragraph}</HelpText>
              </p>
            ))}
          </div>
        </HelpExpandable>

        <HelpExpandable title={fh(page.foundTitle)}>
          <div className="space-y-3 text-lg leading-relaxed text-orange-50">
            {page.foundParagraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>
                <HelpText>{fh(paragraph)}</HelpText>
              </p>
            ))}
            <Link
              href="/gem-bag"
              className="inline-block text-orange-300 underline underline-offset-2 hover:text-orange-200"
            >
              {fh(page.openAlbum)}
            </Link>
          </div>
        </HelpExpandable>

        <HelpExpandable title={page.troubleshootingTitle}>
          <ul className="list-disc space-y-2 ps-5 text-lg leading-relaxed text-orange-50">
            {page.troubleshootingItems.map((item) => (
              <li key={item.slice(0, 24)}>
                <HelpText>{item}</HelpText>
              </li>
            ))}
          </ul>
        </HelpExpandable>
      </div>

      <div className="mt-6">
        <Link
          href="/help/gem-place-demon"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "w-full border-orange-400/50 bg-orange-500/10 text-lg text-orange-100 hover:bg-orange-500/20",
          )}
        >
          {page.linkPlaceDemon}
        </Link>
      </div>
    </HelpShell>
  );
}
