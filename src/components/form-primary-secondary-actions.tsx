"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";

/** Primary on the trailing side (right in RTL, right in LTR). */
export function FormPrimarySecondaryActions({
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  primaryDisabled,
  secondaryDisabled,
  primaryType = "button",
  secondaryType = "button",
  className,
  buttonClassName,
}: {
  primaryLabel: ReactNode;
  secondaryLabel: ReactNode;
  onPrimary: () => void;
  onSecondary: () => void;
  primaryDisabled?: boolean;
  secondaryDisabled?: boolean;
  primaryType?: "button" | "submit";
  secondaryType?: "button";
  className?: string;
  buttonClassName?: string;
}) {
  const { dir } = useLocale();
  return (
    <div className={cn("flex gap-2", dir === "ltr" && "flex-row-reverse", className)}>
      <Button
        type={primaryType}
        disabled={primaryDisabled}
        className={cn(
          "h-11 min-h-11 min-w-0 flex-1 justify-center bg-orange-500 text-base text-black hover:bg-orange-400",
          buttonClassName,
        )}
        onClick={onPrimary}
      >
        {primaryLabel}
      </Button>
      <Button
        type={secondaryType}
        variant="outline"
        disabled={secondaryDisabled}
        className={cn("h-11 min-h-11 min-w-0 flex-1 justify-center text-base", buttonClassName)}
        onClick={onSecondary}
      >
        {secondaryLabel}
      </Button>
    </div>
  );
}
