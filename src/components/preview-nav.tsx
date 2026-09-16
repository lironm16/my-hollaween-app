import Link from "next/link";
import { cn } from "@/lib/utils";

export const PREVIEW_LINKS = [
  { href: "/preview", label: "כל האייקונים" },
  { href: "/preview/sensitivities", label: "רגישויות" },
  { href: "/preview/candies", label: "ממתקים" },
  { href: "/preview/scare", label: "פחד" },
  { href: "/preview/decor", label: "קישוט" },
  { href: "/preview/strollers", label: "עגלות" },
  { href: "/preview/push", label: "התראות" },
  { href: "/preview/hours", label: "שעות" },
] as const;

export function PreviewNav({ current }: { current: string }) {
  return (
    <nav className="flex flex-wrap gap-2">
      {PREVIEW_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "rounded-full px-3 py-2 text-base font-medium",
            current === link.href
              ? "bg-orange-500 text-black"
              : "bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/30",
          )}
        >
          {link.label}
        </Link>
      ))}
      <Link
        href="/"
        className="rounded-full px-3 py-2 text-base text-violet-300 underline-offset-2 hover:underline"
      >
        חזרה למפה
      </Link>
    </nav>
  );
}

export function PreviewPhoto({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="overflow-hidden rounded-2xl ring-1 ring-orange-500/20">
      {/* Huge reference sheets; lazy so the live icons above paint first. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" decoding="async" className="h-auto w-full" />
    </figure>
  );
}
