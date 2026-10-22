"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { buttonVariants } from "@/components/ui/button";
import { renderHelpText } from "@/lib/render-help-text";
import { appVersion } from "@/lib/app-version";
import { fetchPublishedAppVersion, versionsDiffer } from "@/lib/sw-update";
import { cn } from "@/lib/utils";
import type { HelpShotHighlight } from "@/lib/help-shot-highlight";

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
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const published = await fetchPublishedAppVersion();
      if (cancelled || !published || !versionsDiffer(appVersion(), published)) return;
      window.location.reload();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

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

function HelpShotHighlightLayer({ spec }: { spec: HelpShotHighlight }) {
  if (spec.kind === "ring") {
    return (
      <div
        className="pointer-events-none absolute"
        style={{
          left: `${spec.cx * 100}%`,
          top: `${spec.cy * 100}%`,
          width: `${spec.r * 200}%`,
          aspectRatio: "1",
          transform: "translate(-50%, -50%)",
        }}
        aria-hidden
      >
        <div className="absolute inset-0 rounded-full border-[4px] border-[#ff9500]" />
      </div>
    );
  }
  return (
    <div
      className="pointer-events-none absolute rounded-xl border-[4px] border-[#ff9500] bg-[rgba(255,149,0,0.22)]"
      style={{
        left: `${spec.x * 100}%`,
        top: `${spec.y * 100}%`,
        width: `${spec.w * 100}%`,
        height: `${spec.h * 100}%`,
      }}
      aria-hidden
    />
  );
}

export function HelpShot({
  src,
  alt,
  highlight,
}: {
  src: string;
  alt: string;
  highlight?: HelpShotHighlight | HelpShotHighlight[];
}) {
  const layers = highlight ? (Array.isArray(highlight) ? highlight : [highlight]) : [];
  return (
    <div className="overflow-hidden rounded-xl bg-[#12081a] ring-1 ring-orange-500/25">
      <div className="relative w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          width={390}
          height={780}
          className="block h-auto w-full bg-[#12081a]"
          decoding="sync"
        />
        {layers.map((spec, index) => (
          <HelpShotHighlightLayer key={index} spec={spec} />
        ))}
      </div>
    </div>
  );
}

export function HelpStep({
  n,
  title,
  body,
  issueNote,
  image,
  imageAlt,
  imageHighlight,
  action,
  parseBody = typeof body === "string",
  variant = "step",
  hideTitle = false,
  imageFirst = false,
}: {
  n?: number;
  title?: ReactNode;
  body: ReactNode;
  /** Shown below the main body — troubleshooting, not part of the numbered flow. */
  issueNote?: string;
  /** When true (default for string bodies), `body` is parsed for **strong** / *em* only. */
  parseBody?: boolean;
  image?: string;
  imageAlt?: string;
  imageHighlight?: HelpShotHighlight | HelpShotHighlight[];
  action?: ReactNode;
  /** `tip` = troubleshooting block (?) instead of a numbered step. */
  variant?: "step" | "tip";
  hideTitle?: boolean;
  /** Show screenshot above the step text (Android install). */
  imageFirst?: boolean;
}) {
  const renderedTitle = typeof title === "string" ? renderHelpText(title) : title;
  const renderedBody =
    parseBody && typeof body === "string" ? renderHelpText(body) : body;
  const renderedIssue = issueNote ? renderHelpText(issueNote) : null;

  const shot = image ? (
    <HelpShot src={image} alt={imageAlt ?? ""} highlight={imageHighlight} />
  ) : null;

  const badge =
    variant === "tip" ? (
      <span
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-violet-600/90 text-xl font-bold text-violet-50 ring-1 ring-violet-400/40"
        aria-hidden
      >
        ?
      </span>
    ) : (
      <span
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-lg font-bold text-black"
        aria-hidden
      >
        {n}
      </span>
    );

  return (
    <li
      className={cn(
        "space-y-3 rounded-2xl p-4 ring-1",
        variant === "tip" ? "bg-[#181028] ring-violet-500/25" : "bg-[#14081c] ring-orange-500/15",
      )}
    >
      {hideTitle ? (
        <div className="flex items-start gap-3">
          {badge}
          <div className="min-w-0 flex-1 space-y-3 text-lg leading-relaxed text-orange-50">
            {renderedBody}
            {renderedIssue ? (
              <div className="flex items-start gap-3 rounded-xl bg-violet-950/45 p-3 text-base leading-relaxed text-violet-100 ring-1 ring-violet-500/25">
                <span
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-600/90 text-lg font-bold text-violet-50"
                  aria-hidden
                >
                  !
                </span>
                <div>{renderedIssue}</div>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            {badge}
            {title != null && title !== "" ? (
              <h2 className="text-xl font-semibold text-orange-50">{renderedTitle}</h2>
            ) : null}
          </div>
          {imageFirst ? shot : null}
          <div className="space-y-3 text-lg leading-relaxed text-orange-50">
            {renderedBody}
            {renderedIssue ? (
              <div className="flex items-start gap-3 rounded-xl bg-violet-950/45 p-3 text-base leading-relaxed text-violet-100 ring-1 ring-violet-500/25">
                <span
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-600/90 text-lg font-bold text-violet-50"
                  aria-hidden
                >
                  !
                </span>
                <div>{renderedIssue}</div>
              </div>
            ) : null}
          </div>
        </>
      )}
      {action}
      {!imageFirst ? shot : null}
    </li>
  );
}
