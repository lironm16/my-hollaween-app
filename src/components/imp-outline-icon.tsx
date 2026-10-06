import { cn } from "@/lib/utils";
import { ImpDemonOutlineIcon } from "@/components/imp-demon-reference-icon";

/** Line-art demon icon matching user reference design (replaces legacy imp outline). */
export function ImpOutlineIcon({ className }: { className?: string }) {
  return <ImpDemonOutlineIcon className={cn("size-7 shrink-0", className)} />;
}
