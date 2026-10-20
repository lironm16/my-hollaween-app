"use client";

import { LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { kickAndroidGeoPoll } from "@/lib/android-geo-poll";
import { isAndroidLike } from "@/lib/gem-hunt-ar-platform";
import { clearGpsSessionSeed } from "@/lib/gps-session-seed";
import { cn } from "@/lib/utils";

export function AndroidGpsRefreshFab({
  onRefresh,
  className,
}: {
  onRefresh: () => Promise<unknown>;
  className?: string;
}) {
  if (!isAndroidLike()) return null;

  return (
    <button
      type="button"
      className={cn(
        "flex size-11 items-center justify-center rounded-full bg-[#1d1028]/95 text-amber-200 shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-1 ring-amber-400/45",
        className,
      )}
      aria-label="רענון GPS"
      title="רענון GPS — אם הנקודה הכחולה נתקעה"
      onClick={() => {
        clearGpsSessionSeed();
        kickAndroidGeoPoll(true);
        void onRefresh().then(() => {
          toast.message("מנסים לרענן מיקום…", {
            description: "אם עדיין תקוע — סגרו ופתחו את האפליקציה (כמו שעשיתם).",
            duration: 5000,
          });
        });
      }}
    >
      <LocateFixed className="size-5" />
    </button>
  );
}
