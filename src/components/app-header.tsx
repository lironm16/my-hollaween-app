"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, Bell, Home, HousePlus, LogOut, Menu, Pencil, Search, Shield, Sparkles } from "lucide-react";
import { SkipPinBadge } from "@/components/visit-marks";
import { useSkippedHouses } from "@/hooks/use-skipped-houses";
import { toast } from "sonner";
import { BrandTitle } from "@/components/brand-title";
import { NeighborhoodMarquee } from "@/components/neighborhood-marquee";
import { PushAlertsButton } from "@/components/push-alerts-button";
import { useOwnedHouses } from "@/hooks/use-owned-houses";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { buttonVariants } from "@/components/ui/button";
import { useAdminSession } from "@/hooks/use-admin-session";
import { cn } from "@/lib/utils";

export function AppHeader({
  onHomeTap,
  onOpenSkipped,
}: {
  /** Brand title and side-menu Home: return to the last map/list home screen. */
  onHomeTap?: () => void;
  /** Open the skipped-houses list on the home screen. */
  onOpenSkipped?: () => void;
}) {
  const { admin, logout } = useAdminSession();
  const owned = useOwnedHouses();
  const skips = useSkippedHouses();
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
      <div className="app-header__bar mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-3 py-2.5 sm:px-4" dir="ltr">
        <div className="app-header__actions flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            aria-label="תפריט"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25 hover:bg-orange-500/10"
          >
            <Menu className="size-5" />
          </button>
          <PushAlertsButton />
        </div>
        <Link
          href="/"
          aria-label="מסך הבית"
          className="app-header__brand flex min-w-0 flex-col items-end text-right"
          dir="rtl"
          onClick={(event) => {
            if (!onHomeTap) return;
            event.preventDefault();
            onHomeTap();
          }}
        >
          <BrandTitle />
          <NeighborhoodMarquee />
        </Link>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[min(20rem,88vw)] border-orange-500/25 bg-[#160b1f] p-0"
        >
          <SheetHeader className="border-b border-orange-500/15 px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))]">
            <SheetTitle className="text-lg font-semibold text-orange-50">תפריט</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-3 pt-2">
            <Link
              href="/"
              onClick={(event) => {
                setMenuOpen(false);
                if (!onHomeTap) return;
                event.preventDefault();
                onHomeTap();
              }}
              className={cn(
                buttonVariants({ variant: "ghost", size: "lg" }),
                "h-11 justify-start gap-2 text-base text-orange-50 hover:bg-orange-500/10",
              )}
            >
              <Home className="size-4" />
              מסך הבית
            </Link>
            <Link
              href="/search"
              onClick={() => setMenuOpen(false)}
              className={cn(
                buttonVariants({ variant: "ghost", size: "lg" }),
                "h-11 justify-start gap-2 text-base text-orange-50 hover:bg-orange-500/10",
              )}
            >
              <Search className="size-4" />
              חיפוש בית
            </Link>
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
            {owned.length > 0 ? (
              <Link
                href="/my-houses"
                onClick={() => setMenuOpen(false)}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                  "h-11 justify-start gap-2 text-base text-orange-50 hover:bg-orange-500/10",
                )}
              >
                <Home className="size-4" />
                הבתים שלי ({owned.length})
              </Link>
            ) : null}
            {skips.skippedIds.length > 0 && onOpenSkipped ? (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenSkipped();
                }}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                  "h-11 justify-start gap-2 text-base text-orange-50 hover:bg-orange-500/10",
                )}
              >
                <SkipPinBadge size="map" />
                דילגתי ({skips.skippedIds.length})
              </button>
            ) : null}
            <Link
              href="/stats"
              onClick={() => setMenuOpen(false)}
              className={cn(
                buttonVariants({ variant: "ghost", size: "lg" }),
                "h-11 justify-start gap-2 text-base text-orange-50 hover:bg-orange-500/10",
              )}
            >
              <Activity className="size-4" />
              תמונת מצב
            </Link>
            {admin ? (
              <>
                <Link
                  href="/admin/alerts"
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "lg" }),
                    "h-11 justify-start gap-2 text-base text-orange-50 hover:bg-orange-500/10",
                  )}
                >
                  <Bell className="size-4" />
                  התראות לשכונה
                </Link>
                <Link
                  href="/admin/rehearsal"
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "lg" }),
                    "h-11 justify-start gap-2 text-base text-orange-50 hover:bg-orange-500/10",
                  )}
                >
                  <Sparkles className="size-4" />
                  בדיקות
                </Link>
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
              </>
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
          <div className="mt-auto border-t border-orange-500/15 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
            <p className="text-center text-base font-medium tracking-[0.2em] text-violet-400/80">
              Created by
            </p>
            <p className="mt-1 text-center font-display text-base text-orange-200/90">
              Liron Matityahu
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
