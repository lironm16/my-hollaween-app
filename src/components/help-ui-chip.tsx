import { cn } from "@/lib/utils";

/** Inline chip for UI control names in help / Q&A copy (matches toolbar label styling). */
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
        "inline-block rounded-md bg-[#ead5b8] px-1.5 py-0.5 font-semibold text-[#12081a] align-baseline leading-normal",
        className,
      )}
      style={{ backgroundColor: "#ead5b8", color: "#12081a" }}
    >
      {children}
    </span>
  );
}
