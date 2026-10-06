import { cn } from "@/lib/utils";
import { ImpDemonOutlineIcon } from "@/components/imp-demon-reference-icon";

/** Line-art demon icon matching user reference design (replaces legacy imp outline). */
export function ImpOutlineIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center overflow-hidden",
        className,
      )}
      aria-hidden
    >
      <ImpDemonOutlineIcon className="size-[1.55rem] text-orange-100" />
    </span>
  );
}
