"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandTitle } from "@/components/brand-title";
import { PushAlertsButton } from "@/components/push-alerts-button";
import { config } from "@/lib/config";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppHeader({
  actions,
  onMainTap,
}: {
  actions?: React.ReactNode;
  /** When set, tapping the brand resets to the main map overview. */
  onMainTap?: () => void;
}) {
  const router = useRouter();

  return (
    <header
      className="app-header relative z-50 border-b border-orange-500/20 bg-[#14091c]/90 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md"
      style={{ flexShrink: 0 }}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2.5 sm:px-4">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5"
          onClick={(event) => {
            if (!onMainTap) return;
            event.preventDefault();
            onMainTap();
            router.push("/");
          }}
        >
          {/* Static PWA icon; next/image is unnecessary for this tiny local asset. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-192.png"
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-xl ring-1 ring-orange-400/40"
          />
          <span className="min-w-0">
            <BrandTitle />
            <span className="mt-0.5 block truncate text-[11px] text-violet-200/80">
              {config.neighborhood}
            </span>
          </span>
        </Link>
        <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
          <PushAlertsButton />
          {actions}
          <Link
            href="/add"
            className={cn(buttonVariants({ size: "sm" }), "bg-orange-500 text-black hover:bg-orange-400")}
          >
            הוסיפו בית
          </Link>
        </div>
      </div>
    </header>
  );
}
