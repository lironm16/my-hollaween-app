"use client";

import { Button } from "@/components/ui/button";
import { adminStyleStripClass } from "@/components/admin-style-strip";
import { cn } from "@/lib/utils";

/** Menu strip when night passes are on but this device is not registered. */
export function NightPassConnectStrip({
  className,
  onConnect,
}: {
  className?: string;
  onConnect: () => void;
}) {
  return (
    <div className={cn(adminStyleStripClass(className), "items-center")}>
      <div className="min-w-0 flex-1 text-start">
        <p className="text-base font-medium text-orange-100">מכשיר לא מחובר</p>
        <p className="truncate text-sm text-violet-400">לא רשום לאירוע</p>
      </div>
      <Button
        type="button"
        size="sm"
        className="shrink-0 bg-orange-500 text-black hover:bg-orange-400"
        onClick={onConnect}
      >
        חיבור לאירוע
      </Button>
    </div>
  );
}
