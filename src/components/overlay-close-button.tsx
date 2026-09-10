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
}: {
  onClose: () => void;
  className?: string;
  label?: string;
}) {
  return (
    <div className={cn("hw-overlay-close-bar", className)}>
      <OverlayCloseButton onClick={onClose} label={label} />
    </div>
  );
}
