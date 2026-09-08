import { Check, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Outline check when off; solid green disc + white check when visited. */
export function VisitedCheck({
  visited,
  size = "md",
  inButton = false,
  className,
}: {
  visited?: boolean;
  size?: "sm" | "md" | "lg";
  /** Parent is already a green circle — only draw the white check. */
  inButton?: boolean;
  className?: string;
}) {
  const box = size === "lg" ? "size-9" : size === "sm" ? "size-5" : "size-6";
  const mark = size === "lg" ? "size-5" : size === "sm" ? "size-4" : "size-4";
  if (visited) {
    if (inButton) {
      return <Check className={cn("size-5 text-white", className)} strokeWidth={3} />;
    }
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-emerald-600 text-white",
          box,
          className,
        )}
      >
        <Check className={mark} strokeWidth={3} />
      </span>
    );
  }
  return <CheckCircle2 className={cn(box, className)} strokeWidth={2.2} />;
}
