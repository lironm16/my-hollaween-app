"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AdminStyleStrip } from "@/components/admin-style-strip";
import { disconnectNightPassOnDevice, type NightPassState } from "@/lib/night-pass-client";

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

  const trailing =
    onDetails || showDisconnect ? (
      <div className="flex flex-col items-end gap-1">
        {onDetails ? (
          <button
            type="button"
            onClick={onDetails}
            className="text-sm font-medium text-orange-300 underline underline-offset-2"
          >
            פרטים
          </button>
        ) : null}
        {showDisconnect ? (
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
    ) : null;

  return (
    <AdminStyleStrip
      className={className}
      title="מכשיר מחובר"
      subtitle={subtitle}
      trailing={trailing}
    />
  );
}
