"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        dir="rtl"
        showCloseButton={false}
        className={cn(
          "house-edit-modal grid max-h-[min(90dvh,720px)] w-[min(100%-2rem,24rem)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden border-orange-500/30 bg-[#1d1028] p-0 text-orange-50 ring-orange-500/25",
          className,
        )}
      >
        <OverlayCloseBar onClose={onClose} className="border-b border-orange-500/20 pb-2" />
        <DialogHeader className="shrink-0 px-4 pb-3 pt-1 text-center">
          <DialogTitle className="font-display text-xl text-orange-200">{title}</DialogTitle>
          {subtitle ? <p className="mt-0.5 truncate text-base text-violet-200">{subtitle}</p> : null}
        </DialogHeader>
        <div className="house-edit-modal-body min-h-0 overflow-y-auto overscroll-contain px-4 py-4">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
