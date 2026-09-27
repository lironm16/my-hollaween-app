import { cn } from "@/lib/utils";

/** Inline label for UI control names in help copy — matches toolbar accent (e.g. «סינון»). */
export function HelpUiChip({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-md bg-orange-500/25 px-1.5 py-0.5 font-bold text-orange-200 align-baseline leading-normal ring-1 ring-orange-400/35",
        className,
      )}
    >
      {children}
    </span>
  );
}
