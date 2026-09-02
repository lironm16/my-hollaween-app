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
    <span className={cn("block min-w-0 truncate leading-none", className)}>
      <span dir="ltr" className="inline-flex max-w-full items-baseline gap-[0.4em] align-baseline">
        <span
          className={cn(
            "font-display tracking-wide text-orange-400 [text-shadow:0_0_14px_rgba(251,146,60,0.45)]",
            size === "header" ? "text-[1.35rem] sm:text-[1.55rem]" : "text-4xl sm:text-5xl",
          )}
        >
          {config.brandEn}
        </span>
        <span
          className={cn(
            "font-sans font-semibold text-orange-300",
            size === "header" ? "text-sm sm:text-base" : "text-xl sm:text-2xl",
          )}
        >
          {config.brandHe}
        </span>
      </span>
    </span>
  );
}
