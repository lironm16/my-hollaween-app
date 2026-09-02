import { config } from "@/lib/config";
import { cn } from "@/lib/utils";

export function PersistNote({ className }: { className?: string }) {
  if (config.durableWrites) return null;
  return (
    <p
      className={cn(
        "rounded-xl bg-amber-950/50 px-3 py-2 text-sm text-amber-100 ring-1 ring-amber-500/25",
        className,
      )}
    >
      האתר המפורסם לא שומר בתים חדשים בשרת — אין מסד נתונים בתוכנית החינמית. הבית נשאר בטלפון הזה (סיכת 👻 במפה). מנהל יראה אותו רק אם מריצים את האפליקציה על מחשב, או אחרי ייצוא catalog.json.
    </p>
  );
}
