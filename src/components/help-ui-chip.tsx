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
        "inline-block rounded-md border-0 bg-[#ead5b8] px-1.5 py-0.5 font-semibold text-[#12081a] align-baseline leading-normal ring-0 outline-none",
        className,
      )}
      style={{
        backgroundColor: "#ead5b8",
        color: "#12081a",
        WebkitTextFillColor: "#12081a",
        border: "none",
        boxDecorationBreak: "clone",
        WebkitBoxDecorationBreak: "clone",
      }}
    >
      {children}
    </span>
  );
}
