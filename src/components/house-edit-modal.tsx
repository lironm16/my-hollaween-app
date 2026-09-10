"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
        <DialogHeader className="shrink-0 border-b border-orange-500/20 px-4 py-3 text-center">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 text-center">
              <DialogTitle className="font-display text-xl text-orange-200">{title}</DialogTitle>
              {subtitle ? <p className="mt-0.5 truncate text-base text-violet-200">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              className="house-edit-overlay-close shrink-0"
              aria-label="סגירה"
              onClick={onClose}
            >
              <X className="size-5" />
            </button>
          </div>
        </DialogHeader>
        <div className="house-edit-modal-body min-h-0 overflow-y-auto overscroll-contain px-4 py-4">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
