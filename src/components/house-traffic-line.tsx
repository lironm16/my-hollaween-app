"use client";

import { EMPTY_TRAFFIC, type HouseTraffic } from "@/lib/traffic";
import { cn } from "@/lib/utils";

export function HouseTrafficLine({
  traffic,
  variant = "public",
  compact = false,
  className,
}: {
  traffic?: HouseTraffic | null;
  variant?: "public" | "owner";
  compact?: boolean;
  className?: string;
}) {
  const counts = traffic ?? EMPTY_TRAFFIC;
  const total = counts.saved + counts.visited;
  if (total <= 0) {
    if (variant === "owner" && !compact) {
      return (
        <p className={cn("text-base text-violet-300", className)}>
          עדיין אין סימונים מהשכונה לבית הזה. כשמשפחות ישמרו אותו או יסמנו «ביקרתי» — יופיע כאן כמה
          אנשים מתכננים להגיע.
        </p>
      );
    }
    return null;
  }

  const bits = [
    counts.saved > 0 ? `${counts.saved} שמרו` : null,
    counts.visited > 0 ? `${counts.visited} ביקרו` : null,
  ].filter(Boolean);

  if (variant === "owner") {
    if (compact) {
      return (
        <p
          className={cn(
            "rounded-lg bg-emerald-950/50 px-2.5 py-1 text-base font-medium text-emerald-100 ring-1 ring-emerald-500/25",
            className,
          )}
        >
          תנועה · {bits.join(" · ")}
        </p>
      );
    }
    return (
      <div className={cn("rounded-xl bg-emerald-950/40 px-3 py-2 ring-1 ring-emerald-500/20", className)}>
        <p className="text-base font-medium text-emerald-100">תנועה לבית · {bits.join(" · ")}</p>
        <p className="mt-1 text-base text-emerald-50/90">
          זה לא סופר ילדים בפתח — רק כמה טלפונים שמרו את הבית או סימנו ביקור. פתיחת מסלול לא נספרת,
          כי הרבה פותחים רק כדי לראות. המספרים מתעדכנים בערך כל דקה.
        </p>
      </div>
    );
  }

  return <p className={cn("text-base text-violet-200", className)}>{bits.join(" · ")}</p>;
}
