"use client";

import type { ReactNode } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { OverlayCloseBar } from "@/components/overlay-close-button";
import { cn } from "@/lib/utils";

/** Centered house-owner modal above the map sheet and other UI. */
export function HouseEditModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  className,
  /** Keeps the sheet below the OS status bar and scrolls tall content (e.g. visit poster). */
  placement = "center",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  placement?: "center" | "top-safe";
}) {
  const topSafe = placement === "top-safe";
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        dir="rtl"
        showCloseButton={false}
        className={cn(
          "house-edit-modal grid w-[min(100%-2rem,26rem)] max-w-[calc(100vw-2rem)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden border-orange-500/30 bg-[#1d1028] p-0 text-orange-50 ring-orange-500/25",
          topSafe
            ? "top-[max(0.5rem,env(safe-area-inset-top))] max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-0.5rem)] -translate-y-0"
            : "top-1/2 max-h-[min(90dvh,720px)] -translate-y-1/2",
          className,
        )}
      >
        <OverlayCloseBar
          compact={!topSafe}
          onClose={onClose}
          title={title}
          subtitle={subtitle}
          className="border-b border-orange-500/20 pb-2"
        />
        <div
          className={cn(
            "house-edit-modal-body min-h-0 overflow-y-auto overscroll-contain px-4 py-4",
            topSafe && "pb-[max(1rem,env(safe-area-inset-bottom))]",
          )}
        >
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
