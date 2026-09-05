import { Check, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Outline check when off; solid green disc + white check when visited. */
export function VisitedCheck({
  visited,
  size = "md",
  inButton = false,
}: {
  visited?: boolean;
  size?: "sm" | "md";
  /** Parent is already a green circle — only draw the white check. */
  inButton?: boolean;
}) {
  const box = size === "sm" ? "size-5" : "size-6";
  const mark = size === "sm" ? "size-3" : "size-3.5";
  if (visited) {
    if (inButton) {
      return <Check className="size-5 text-white" strokeWidth={3} />;
    }
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-emerald-600 text-white",
          box,
        )}
      >
        <Check className={mark} strokeWidth={3} />
      </span>
    );
  }
  return <CheckCircle2 className={box} strokeWidth={2.2} />;
}
