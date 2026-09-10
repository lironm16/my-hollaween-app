"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function OverlayCloseButton({
  onClick,
  className,
  label = "סגירה",
}: {
  onClick: () => void;
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      className={cn("hw-overlay-close", className)}
      aria-label={label}
      onClick={onClick}
    >
      <X className="size-5" />
    </button>
  );
}

export function OverlayCloseBar({
  onClose,
  className,
  label,
  compact = false,
}: {
  onClose: () => void;
  className?: string;
  label?: string;
  /** Drop safe-area top inset — for centered modals and bottom sheets. */
  compact?: boolean;
}) {
  return (
    <div className={cn("hw-overlay-close-bar", compact && "hw-overlay-close-bar--compact", className)}>
      <OverlayCloseButton onClick={onClose} label={label} />
    </div>
  );
}
