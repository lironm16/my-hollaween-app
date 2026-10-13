"use client";

import { HelpShell } from "@/components/help-shell";
import { HelpContactForm } from "@/components/help-contact-form";

export default function HelpContactPage() {
  return (
    <HelpShell title="עזרה אישית" backHref="/" backLabel="חזרה לדף הבית">
      <div className="rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20">
        <HelpContactForm />
      </div>
    </HelpShell>
  );
}
