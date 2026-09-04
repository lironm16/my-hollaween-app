"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HousePlus, LogOut, Menu, Pencil, Shield } from "lucide-react";
import { toast } from "sonner";
import { BrandTitle } from "@/components/brand-title";
import { PushAlertsButton } from "@/components/push-alerts-button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { buttonVariants } from "@/components/ui/button";
import { useAdminSession } from "@/hooks/use-admin-session";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";

export function AppHeader({
  onMainTap,
}: {
  /** When set, tapping the brand resets to the main map overview. */
  onMainTap?: () => void;
}) {
  const router = useRouter();
  const { admin, logout } = useAdminSession();
  const [menuOpen, setMenuOpen] = useState(false);

  async function onLogout() {
    setMenuOpen(false);
    await logout();
    toast.message("יצאתם ממצב מנהל");
  }

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
            <span className="mt-0.5 block truncate text-[13px] text-violet-200/80">
              {config.neighborhood}
            </span>
          </span>
        </Link>
        <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
          <PushAlertsButton />
          <button
            type="button"
            aria-label="תפריט"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25 hover:bg-orange-500/10"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="left"
          className="w-[min(20rem,88vw)] border-orange-500/25 bg-[#160b1f] p-0 pt-[env(safe-area-inset-top,0px)]"
        >
          <SheetHeader className="border-b border-orange-500/15 px-4 py-3">
            <SheetTitle className="text-lg font-semibold text-orange-50">תפריט</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-2 p-4">
            <Link
              href="/add"
              onClick={() => setMenuOpen(false)}
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-11 justify-start gap-2 bg-orange-500 text-base text-black hover:bg-orange-400",
              )}
            >
              <HousePlus className="size-4" />
              הוסיפו בית
            </Link>
            <Link
              href="/edit"
              onClick={() => setMenuOpen(false)}
              className={cn(
                buttonVariants({ variant: "ghost", size: "lg" }),
                "h-11 justify-start gap-2 text-base text-orange-50 hover:bg-orange-500/10",
              )}
            >
              <Pencil className="size-4" />
              עריכת בית
            </Link>
            {admin ? (
              <button
                type="button"
                onClick={() => void onLogout()}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-11 justify-start gap-2 border-orange-400/40 text-base text-orange-100",
                )}
              >
                <LogOut className="size-4" />
                יציאה
              </button>
            ) : (
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                  "h-11 justify-start gap-2 text-base text-violet-200 hover:bg-orange-500/10",
                )}
              >
                <Shield className="size-4" />
                כניסת מנהל
              </Link>
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
