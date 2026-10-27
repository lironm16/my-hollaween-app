"use client";

import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import { useLocale } from "@/hooks/use-locale";

export function BrandTitle({
  className,
  size = "header",
}: {
  className?: string;
  size?: "header" | "hero";
}) {
  const { locale, dir, t } = useLocale();
  const showHebrewSubtitle = locale === "he";

  return (
    <span
      className={cn(
        "block w-full min-w-0 leading-none",
        locale === "he" ? "text-right" : "text-left",
        className,
      )}
    >
      <span
        dir={dir}
        className={cn(
          "inline-flex max-w-full flex-wrap items-baseline gap-x-[0.4em] gap-y-0.5",
          locale === "he" ? "justify-end text-right" : "justify-start text-left",
        )}
      >
        <span
          dir="ltr"
          className={cn(
            "font-creepster tracking-wide text-orange-400 [text-shadow:0_0_14px_rgba(251,146,60,0.45)]",
            size === "header" ? "text-[1.2rem] sm:text-[1.4rem]" : "text-4xl sm:text-5xl",
          )}
        >
          {config.brandEn}
        </span>
        {showHebrewSubtitle ? (
          <span
            className={cn(
              "font-sans font-semibold text-orange-300",
              size === "header" ? "text-base" : "text-xl sm:text-2xl",
            )}
          >
            {config.brandHe}
          </span>
        ) : (
          <span
            className={cn(
              "font-sans font-medium text-orange-300/90",
              size === "header" ? "text-sm sm:text-base" : "text-lg sm:text-xl",
            )}
          >
            {t("brand.tagline")}
          </span>
        )}
      </span>
    </span>
  );
}
