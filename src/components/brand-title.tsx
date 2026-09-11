import { cn } from "@/lib/utils";
import { config } from "@/lib/config";

export function BrandTitle({
  className,
  size = "header",
}: {
  className?: string;
  size?: "header" | "hero";
}) {
  return (
    <span className={cn("block w-full min-w-0 text-right leading-none", className)}>
      <span
        dir="rtl"
        className="inline-flex max-w-full flex-wrap items-baseline justify-end gap-x-[0.4em] gap-y-0.5 text-right"
      >
        <span
          className={cn(
            "font-sans font-semibold text-orange-300",
            size === "header" ? "text-base" : "text-xl sm:text-2xl",
          )}
        >
          {config.brandHe}
        </span>
        <span
          dir="ltr"
          className={cn(
            "font-creepster tracking-wide text-orange-400 [text-shadow:0_0_14px_rgba(251,146,60,0.45)]",
            size === "header" ? "text-[1.2rem] sm:text-[1.4rem]" : "text-4xl sm:text-5xl",
          )}
        >
          {config.brandEn}
        </span>
      </span>
    </span>
  );
}
