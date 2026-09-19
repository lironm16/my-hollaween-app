"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function HelpShell({
  title,
  children,
  backHref = "/help",
  backLabel = "חזרה",
}: {
  title: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="relative flex h-dvh min-h-dvh flex-col overflow-hidden">
      <AppHeader />
      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-10 text-lg">
        <div className="mx-auto w-full max-w-lg">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-display text-3xl text-orange-300">{title}</h1>
          <Link href={backHref} className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
            {backLabel}
          </Link>
        </div>
        {children}
        </div>
      </main>
    </div>
  );
}

export function HelpExpandable({
  title,
  subtitle,
  children,
  defaultOpen = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-2xl bg-[#1d1028] ring-1 ring-orange-500/25">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-4 text-right transition hover:bg-[#241332]"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-xl font-semibold text-orange-50">{title}</span>
          {subtitle ? <span className="mt-1 block text-lg text-orange-100/90">{subtitle}</span> : null}
        </span>
        <ChevronDown
          className={cn("size-6 shrink-0 text-orange-400 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open ? <div className="border-t border-orange-500/15 px-3 pb-4 pt-3">{children}</div> : null}
    </section>
  );
}

export function HelpShot({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="overflow-hidden rounded-xl bg-[#12081a] ring-1 ring-orange-500/25">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={390}
        height={780}
        className="block h-auto min-h-[12rem] w-full bg-[#12081a] object-contain object-top"
        decoding="sync"
      />
    </div>
  );
}

export function HelpStep({
  n,
  title,
  body,
  image,
  imageAlt,
  action,
}: {
  n: number;
  title: string;
  body: ReactNode;
  image: string;
  imageAlt: string;
  action?: ReactNode;
}) {
  return (
    <li className="space-y-3 rounded-2xl bg-[#14081c] p-4 ring-1 ring-orange-500/15">
      <div className="flex items-center gap-3">
        <span
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-lg font-bold text-black"
          aria-hidden
        >
          {n}
        </span>
        <h2 className="text-xl font-semibold text-orange-50">{title}</h2>
      </div>
      <div className="text-lg leading-relaxed text-orange-50">{body}</div>
      {action}
      <HelpShot src={image} alt={imageAlt} />
    </li>
  );
}
