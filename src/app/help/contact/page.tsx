"use client";

import { HelpShell } from "@/components/help-shell";
import { HelpContactForm } from "@/components/help-contact-form";
import { useHelpMessages } from "@/hooks/use-help-messages";

export default function HelpContactPage() {
  const { help } = useHelpMessages();

  return (
    <HelpShell title={help.contact.title} backHref="/" backLabel={help.shell.backToHome}>
      <div className="rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20">
        <HelpContactForm />
      </div>
    </HelpShell>
  );
}
