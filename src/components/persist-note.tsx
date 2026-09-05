import { config } from "@/lib/config";
import { cn } from "@/lib/utils";

export function PersistNote({ className }: { className?: string }) {
  if (config.durableWrites) return null;
  return (
    <p
      className={cn(
        "rounded-xl bg-amber-950/50 px-3 py-2 text-base text-amber-100 ring-1 ring-amber-500/25",
        className,
      )}
    >
      המצב המקומי הזה שומר בתים רק על המחשב שמריץ את האפליקציה. באתר המפורסם כולם רואים את אותה מפה.
    </p>
  );
}
