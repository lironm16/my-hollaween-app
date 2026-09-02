import Link from "next/link";
import { config } from "@/lib/config";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppHeader({
  actions,
}: {
  actions?: React.ReactNode;
}) {
  return (
    <header className="relative z-20 border-b border-orange-500/20 bg-[#14091c]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2.5 sm:px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
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
            <span className="font-display block truncate text-base leading-tight text-orange-300 sm:text-lg">
              {config.appName}
            </span>
            <span className="block truncate text-[11px] text-violet-200/80">
              {config.neighborhood}
            </span>
          </span>
        </Link>
        <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
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
