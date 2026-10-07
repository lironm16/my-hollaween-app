import { ScareBat } from "@/components/scare-glyphs";
import { cn } from "@/lib/utils";

/** Admin add-house — third location type (demon practice). */
export function PracticeLocationSign({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-teal-600 text-orange-50 ring-2 ring-dashed ring-cyan-200/90",
        className,
      )}
      aria-hidden
    >
      <span className="size-[62%] text-orange-50">
        <ScareBat />
      </span>
    </span>
  );
}
