"use client";

import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function HelpShell({
  title,
  children,
  backHref = "/help",
  backLabel = "חזרה לשאלות ותשובות",
}: {
  title: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <AppHeader />
      <main className="relative z-10 mx-auto w-full max-w-lg flex-1 px-4 py-5 pb-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-display text-2xl text-orange-300">{title}</h1>
          <Link href={backHref} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            {backLabel}
          </Link>
        </div>
        {children}
      </main>
    </div>
  );
}

export function HelpSection({
  title,
  children,
  id,
}: {
  title: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/25">
      <h2 className="mb-2 text-lg font-semibold text-orange-200">{title}</h2>
      <div className="space-y-2 text-base leading-relaxed text-violet-100">{children}</div>
    </section>
  );
}

export function HelpStep({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-black"
        aria-hidden
      >
        {n}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </li>
  );
}
