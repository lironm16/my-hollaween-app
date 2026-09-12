"use client";

import type { ReactNode } from "react";
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
  title,
  subtitle,
  trailing,
}: {
  onClose: () => void;
  className?: string;
  label?: string;
  /** Drop safe-area top inset — for centered modals and bottom sheets. */
  compact?: boolean;
  title?: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "hw-overlay-close-bar",
        compact && "hw-overlay-close-bar--compact",
        title && "hw-overlay-close-bar--titled",
        trailing && "hw-overlay-close-bar--trailing",
        className,
      )}
    >
      <OverlayCloseButton onClick={onClose} label={label} />
      {title ? (
        <div className="hw-overlay-close-bar-title">
          <div className="font-display text-xl leading-tight text-orange-200">{title}</div>
          {subtitle ? <p className="mt-0.5 truncate text-base leading-snug text-violet-200">{subtitle}</p> : null}
        </div>
      ) : null}
      {title ? <div className="hw-overlay-close-bar-spacer" aria-hidden /> : null}
      {trailing ? <div className="hw-overlay-close-bar-trailing">{trailing}</div> : null}
    </div>
  );
}
