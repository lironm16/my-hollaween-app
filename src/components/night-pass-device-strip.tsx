"use client";

import { useState } from "react";
import { toast } from "sonner";
import { disconnectNightPassOnDevice, type NightPassState } from "@/lib/night-pass-client";
import { cn } from "@/lib/utils";

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
  showDisconnect?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function disconnect() {
    if (
      !window.confirm(
        "להתנתק מהמכשיר הזה?\n\nהקוד נשאר רשום — אפשר להיכנס שוב עם אותו קוד ואותו מספר טלפון. מכשיר אחר שכבר רשום לא יושפע.",
      )
    ) {
      return;
    }
    setBusy(true);
    const ok = await disconnectNightPassOnDevice();
    setBusy(false);
    if (ok) toast.success("המכשיר התנתק. הקוד עדיין תקף לכניסה מחדש.");
    else toast.error("ההתנתקות נכשלה. נסו שוב.");
  }

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
      <div className="flex shrink-0 flex-col items-end gap-1">
        {onDetails ? (
          <button
            type="button"
            onClick={onDetails}
            className="text-sm font-medium text-orange-300 underline underline-offset-2"
          >
            פרטים
          </button>
        ) : null}
        {showDisconnect !== false ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void disconnect()}
            className="text-sm text-violet-400 underline underline-offset-2 disabled:opacity-50"
          >
            {busy ? "מתנתק…" : "התנתקות"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
