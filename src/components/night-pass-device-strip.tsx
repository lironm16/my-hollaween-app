"use client";

import { cn } from "@/lib/utils";
import type { NightPassState } from "@/lib/night-pass-client";

/** Same chrome as admin «תצוגת משתמש» — registered pass on this device. */
export function NightPassDeviceStrip({
  pass,
  compact = false,
  className,
  onDetails,
}: {
  pass: Pick<NightPassState, "holderName" | "holderPhone" | "houseName">;
  compact?: boolean;
  className?: string;
  onDetails?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl bg-[#12081a] px-3 py-2.5 ring-1 ring-orange-500/20",
        className,
      )}
    >
      <div className="min-w-0 text-start">
        <p className="text-base font-medium text-orange-100">מכשיר רשום לאירוע</p>
        {!compact ? (
          <p className="truncate text-sm text-violet-300">
            {pass.holderName ?? "רשומים"}
            {pass.houseName ? ` · ${pass.houseName}` : ""}
          </p>
        ) : (
          <p className="truncate text-sm text-violet-400">{pass.holderName ?? "פעיל"}</p>
        )}
      </div>
      {onDetails ? (
        <button
          type="button"
          onClick={onDetails}
          className="shrink-0 text-sm font-medium text-orange-300 underline underline-offset-2"
        >
          פרטים
        </button>
      ) : null}
    </div>
  );
}
