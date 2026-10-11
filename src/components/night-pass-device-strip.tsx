"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminStyleStripClass } from "@/components/admin-style-strip";
import { disconnectNightPassOnDevice, type NightPassState } from "@/lib/night-pass-client";
import { cn } from "@/lib/utils";

/** Same chrome as admin «תצוגת משתמש» — registered pass on this device. */
export function NightPassDeviceStrip({
  pass,
  compact = false,
  className,
  onDetails,
  showDisconnect = true,
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
        "להתנתק מהמכשיר הזה?\n\nהקוד נשאר רשום — אפשר להיכנס שוב עם אותו קוד. מכשיר אחר שכבר רשום לא יושפע.",
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

  const subtitle = compact
    ? pass.holderName
      ? pass.holderName
      : "פעיל"
    : [pass.holderName ?? "רשומים", pass.houseName].filter(Boolean).join(" · ");

  const titleBlock = (
    <>
      <p className="text-base font-medium text-orange-100">מכשיר מחובר</p>
      <p className="truncate text-sm text-violet-400">{subtitle}</p>
    </>
  );

  return (
    <div className={cn(adminStyleStripClass(className), "items-center")}>
      {onDetails ? (
        <button
          type="button"
          onClick={onDetails}
          className="min-w-0 flex-1 rounded-lg text-start transition hover:bg-orange-500/5 focus-visible:outline focus-visible:ring-2 focus-visible:ring-orange-500/40"
        >
          {titleBlock}
        </button>
      ) : (
        <div className="min-w-0 flex-1 text-start">{titleBlock}</div>
      )}
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
