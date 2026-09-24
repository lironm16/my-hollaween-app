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
        "inline-block rounded-md bg-[#f5e6d3] px-1.5 py-0.5 font-semibold text-[#12081a] align-baseline leading-normal",
        className,
      )}
      style={{ backgroundColor: "#f5e6d3", color: "#12081a" }}
    >
      {children}
    </span>
  );
}
