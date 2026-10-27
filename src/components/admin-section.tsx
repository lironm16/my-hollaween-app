"use client";

import { useState, type ReactNode } from "react";
import { useLocale } from "@/hooks/use-locale";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminSection({
  title,
  summary,
  defaultOpen = false,
  children,
  className,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const { dir } = useLocale();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className={cn("overflow-hidden rounded-xl bg-[#12081a]/90 ring-1 ring-orange-500/15", className)}
      dir={dir}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-start transition hover:bg-orange-500/5"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-orange-100">{title}</span>
          {summary ? (
            <span
              className={cn(
                "block text-sm text-violet-400",
                open ? "mt-0.5 line-clamp-none" : "truncate",
              )}
            >
              {summary}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn("size-5 shrink-0 text-violet-400 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="space-y-2 border-t border-orange-500/10 px-3 pb-3 pt-2">{children}</div>
      ) : null}
    </section>
  );
}

export function AdminHelpDetails({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="rounded-lg bg-black/20 px-2 py-1 text-sm text-violet-300 ring-1 ring-orange-500/10">
      <summary className="cursor-pointer select-none py-0.5 text-violet-200 marker:text-orange-400">{label}</summary>
      <div className="pb-1 pt-1 leading-snug">{children}</div>
    </details>
  );
}
