"use client";

import { EMPTY_TRAFFIC, type HouseTraffic } from "@/lib/traffic";
import { cn } from "@/lib/utils";

export function HouseTrafficLine({
  traffic,
  variant = "public",
  className,
}: {
  traffic?: HouseTraffic | null;
  variant?: "public" | "owner";
  className?: string;
}) {
  const counts = traffic ?? EMPTY_TRAFFIC;
  const total = counts.saved + counts.routed + counts.visited;
  if (total <= 0) {
    if (variant === "owner") {
      return (
        <p className={cn("text-base text-violet-300", className)}>
          עדיין אין סימונים מהשכונה לבית הזה. כשמשפחות ישמרו אותו, יוסיפו למסלול או יסמנו «ביקרתי» —
          יופיע כאן כמה אנשים מתכננים להגיע.
        </p>
      );
    }
    return null;
  }

  const bits = [
    counts.saved > 0 ? `${counts.saved} שמרו` : null,
    counts.routed > 0 ? `${counts.routed} במסלול` : null,
    counts.visited > 0 ? `${counts.visited} ביקרו` : null,
  ].filter(Boolean);

  if (variant === "owner") {
    return (
      <div className={cn("rounded-xl bg-emerald-950/40 px-3 py-2 ring-1 ring-emerald-500/20", className)}>
        <p className="text-base font-medium text-emerald-100">תנועה לבית · {bits.join(" · ")}</p>
        <p className="mt-1 text-base text-emerald-50/90">
          זה לא סופר ילדים בפתח — רק כמה טלפונים שמרו, בנו מסלול, או סימנו ביקור. עוזר להעריך מלאי
          ממתקים בלי לעקוב אחרי מיקום.
        </p>
      </div>
    );
  }

  return <p className={cn("text-base text-violet-200", className)}>{bits.join(" · ")}</p>;
}
