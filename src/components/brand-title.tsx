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
    <span className={cn("block min-w-0 leading-none", className)}>
      <span
        dir="ltr"
        className="inline-flex max-w-full flex-wrap items-baseline gap-x-[0.4em] gap-y-0.5 align-baseline"
      >
        <span
          className={cn(
            "font-sans font-semibold text-orange-300",
            size === "header" ? "text-base" : "text-xl sm:text-2xl",
          )}
        >
          {config.brandHe}
        </span>
        <span aria-hidden="true"> </span>
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
