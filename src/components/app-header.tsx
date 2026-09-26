"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  Bell,
  ChevronDown,
  Home,
  HousePlus,
  LogOut,
  Menu,
  Pencil,
  Search,
  Shield,
  HelpCircle,
  Gem,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { BrandTitle } from "@/components/brand-title";
import { NeighborhoodMarquee } from "@/components/neighborhood-marquee";
import { PushAlertsButton } from "@/components/push-alerts-button";
import { PwaInstallButton } from "@/components/pwa-install-button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { buttonVariants } from "@/components/ui/button";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useAppNow } from "@/hooks/use-app-clock";
import { useGemHuntAdminUi } from "@/hooks/use-gem-admin-ui";
import { appVersionLabel } from "@/lib/app-version";
import { pushAlertsEnabled } from "@/lib/push-enabled";
import { cn } from "@/lib/utils";

export function AppHeader({
  onHomeTap,
}: {
  /** Brand title and side-menu Home: return to the last map/list home screen. */
  onHomeTap?: () => void;
}) {
  const { admin, logout } = useAdminSession();
  const now = useAppNow();
  const { gemBagMenuVisible: showGemBag } = useGemHuntAdminUi(admin, now);
  const [menuOpen, setMenuOpen] = useState(false);
  const [houseOpen, setHouseOpen] = useState(true);

  async function onLogout() {
    setMenuOpen(false);
    await logout();
    toast.message("יצאתם ממצב מנהל");
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  const houseSubLinkClass = cn(
    buttonVariants({ variant: "ghost", size: "lg" }),
    "h-10 justify-start gap-2 ps-14 text-base text-orange-50 hover:bg-orange-500/10",
  );

  return (
    <header
      className="app-header relative z-50 border-b border-orange-500/20 bg-[#14091c]/90 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md"
      style={{ flexShrink: 0 }}
    >
      <div className="app-header__bar" dir="ltr">
        <div className="app-header__actions">
          <button
            type="button"
            aria-label="תפריט"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25 hover:bg-orange-500/10"
          >
            <Menu className="size-5" />
          </button>
          <PwaInstallButton />
          <PushAlertsButton />
        </div>
        <Link
          href="/"
          aria-label="מסך הבית"
          className="app-header__brand"
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

      {menuOpen ? (
      <Sheet open onOpenChange={setMenuOpen}>
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
                closeMenu();
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

            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                aria-expanded={houseOpen}
                onClick={() => setHouseOpen((open) => !open)}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                  "h-11 justify-start gap-2 text-base text-orange-50 hover:bg-orange-500/10",
                )}
              >
                <Home className="size-4" />
                <span className="flex-1 text-start">בית</span>
                <ChevronDown
                  className={cn("size-4 shrink-0 text-violet-400 transition-transform", houseOpen && "rotate-180")}
                  aria-hidden
                />
              </button>
              {houseOpen ? (
                <div className="mr-4 flex flex-col gap-0.5 border-s border-orange-500/25 ps-2">
                  <Link
                    href="/add"
                    onClick={closeMenu}
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "h-10 justify-start gap-2 ps-14 text-base bg-orange-500 text-black hover:bg-orange-400",
                    )}
                  >
                    <HousePlus className="size-4" />
                    הוספה
                  </Link>
                  <Link href="/edit" onClick={closeMenu} className={houseSubLinkClass}>
                    <Pencil className="size-4" />
                    עריכה
                  </Link>
                  <Link href="/search" onClick={closeMenu} className={houseSubLinkClass}>
                    <Search className="size-4" />
                    חיפוש
                  </Link>
                  <Link href="/my" onClick={closeMenu} className={houseSubLinkClass}>
                    <Home className="size-4" />
                    במכשיר שלי
                  </Link>
                </div>
              ) : null}
            </div>

            <Link
              href="/stats"
              onClick={closeMenu}
              className={cn(
                buttonVariants({ variant: "ghost", size: "lg" }),
                "h-11 justify-start gap-2 text-base text-orange-50 hover:bg-orange-500/10",
              )}
            >
              <Activity className="size-4" />
              תמונת מצב
            </Link>
            {showGemBag ? (
              <Link
                href="/gem-bag"
                onClick={closeMenu}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                  "h-11 justify-start gap-2 text-base text-orange-50 hover:bg-orange-500/10",
                )}
              >
                <Gem className="size-4 text-amber-300/90" />
                ספר החברים
              </Link>
            ) : null}
            <Link
              href="/help"
              onClick={closeMenu}
              className={cn(
                buttonVariants({ variant: "ghost", size: "lg" }),
                "h-11 justify-start gap-2 text-base text-orange-50 hover:bg-orange-500/10",
              )}
            >
              <HelpCircle className="size-4" />
              שאלות ותשובות
            </Link>
            {admin ? (
              <>
                {pushAlertsEnabled() ? (
                  <Link
                    href="/admin/alerts"
                    onClick={closeMenu}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "lg" }),
                      "h-11 justify-start gap-2 text-base text-orange-50 hover:bg-orange-500/10",
                    )}
                  >
                    <Bell className="size-4" />
                    התראות לשכונה
                  </Link>
                ) : null}
                <Link
                  href="/admin/rehearsal"
                  onClick={closeMenu}
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
                onClick={closeMenu}
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
            <p className="mt-1 text-center text-sm tabular-nums text-violet-300/90" dir="ltr">
              {appVersionLabel()}
            </p>
          </div>
        </SheetContent>
      </Sheet>
      ) : null}
    </header>
  );
}
