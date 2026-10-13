"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminStyleStripClass } from "@/components/admin-style-strip";
import { disconnectNightPassOnDevice, type NightPassState } from "@/lib/night-pass-client";
import { cn } from "@/lib/utils";

/** Menu strip when this device has an active pass — disconnect only, no details popup. */
export function NightPassDeviceStrip({
  pass,
  compact = false,
  className,
  showDisconnect = true,
}: {
  pass: Pick<NightPassState, "holderName" | "holderPhone" | "houseName">;
  compact?: boolean;
  className?: string;
  showDisconnect?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function disconnect() {
    if (
      !window.confirm(
        "להתנתק מהמכשיר הזה?\n\nקוד הכניסה נשאר רשום — אפשר להיכנס שוב עם אותו קוד כניסה. מכשיר אחר שכבר רשום לא יושפע.",
      )
    ) {
      return;
    }
    setBusy(true);
    const ok = await disconnectNightPassOnDevice();
    setBusy(false);
    if (ok) toast.success("המכשיר התנתק. קוד הכניסה עדיין תקף לכניסה מחדש.");
    else toast.error("ההתנתקות נכשלה. נסו שוב.");
  }

  const subtitle = compact
    ? pass.holderName
      ? pass.holderName
      : "פעיל"
    : [pass.holderName ?? "רשומים", pass.houseName].filter(Boolean).join(" · ");

  return (
    <div className={cn(adminStyleStripClass(className), "items-center")}>
      <div className="min-w-0 flex-1 text-start">
        <p className="text-base font-medium text-orange-100">מכשיר מחובר</p>
        <p className="truncate text-sm text-violet-400">{subtitle}</p>
      </div>
      {showDisconnect ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          className="shrink-0 border-violet-500/30 text-violet-100 hover:bg-violet-950/40"
          onClick={() => void disconnect()}
        >
          {busy ? "מתנתק…" : "התנתקות"}
        </Button>
      ) : null}
    </div>
  );
}
