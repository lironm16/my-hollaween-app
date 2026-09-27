"use client";

import { useState } from "react";
import { ChevronDown, Route, Save, Share2 } from "lucide-react";
import { readMenuSectionOpen, writeMenuSectionOpen } from "@/lib/menu-section-state";
import { APP_MENU_SUBLINK_PAD, APP_MENU_SUBLIST_CLASS } from "@/components/app-menu-styles";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const subLinkClass = cn(
  buttonVariants({ variant: "ghost", size: "lg" }),
  "h-10 justify-start gap-2 text-base text-orange-50 hover:bg-orange-500/10",
  APP_MENU_SUBLINK_PAD,
);

export function RouteMenuSection({
  onNavigate,
  onOpenExport,
  onOpenShare,
}: {
  onNavigate?: () => void;
  /** Parent owns export dialog so it stays mounted when the menu sheet closes. */
  onOpenExport?: () => void;
  /** Same pattern as export — parent opens share dialog after closing the menu. */
  onOpenShare?: () => void;
}) {
  const [open, setOpen] = useState(() => readMenuSectionOpen("route", false));

  function openExportDialog() {
    onOpenExport?.();
  }

  function openShareDialog() {
    onOpenShare?.();
  }

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() =>
          setOpen((value) => {
            const next = !value;
            writeMenuSectionOpen("route", next);
            return next;
          })
        }
        className={cn(
          buttonVariants({ variant: "ghost", size: "lg" }),
          "h-11 justify-start gap-2 text-base text-orange-50 hover:bg-orange-500/10",
        )}
      >
        <Route className="size-4" />
        <span className="flex-1 text-start">מסלול</span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-violet-400 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open ? (
        <div className={APP_MENU_SUBLIST_CLASS}>
          <button type="button" onClick={openExportDialog} className={subLinkClass}>
            <Save className="size-4" strokeWidth={2.25} />
            הורד
          </button>
          <button type="button" onClick={openShareDialog} className={subLinkClass}>
            <Share2 className="size-4" />
            שתף
          </button>
        </div>
      ) : null}
    </div>
  );
}
