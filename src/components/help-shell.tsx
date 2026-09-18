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
  backLabel = "חזרה",
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
          <Link href={backHref} className={cn(buttonVariants({ size: "default", variant: "outline" }))}>
            {backLabel}
          </Link>
        </div>
        {children}
      </main>
    </div>
  );
}

export function HelpShot({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-orange-500/25">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="block w-full bg-[#12081a]" loading="lazy" />
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
    <li className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20">
      <div className="flex items-center gap-2.5">
        <span
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-base font-bold text-black"
          aria-hidden
        >
          {n}
        </span>
        <h2 className="text-lg font-semibold text-orange-50">{title}</h2>
      </div>
      <div className="text-base leading-relaxed text-orange-50">{body}</div>
      {action}
      <HelpShot src={image} alt={imageAlt} />
    </li>
  );
}
