"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  cancelDeviceInvite,
  createDeviceInvite,
  fetchDevicePanel,
  roleBadgeLabel,
  type DevicePanel,
} from "@/lib/access-client";
import type { DeviceRole } from "@/lib/types";

export function HouseAccessPanel({
  houseId,
  onChanged,
}: {
  houseId: string;
  onChanged?: () => void;
}) {
  const [panel, setPanel] = useState<DevicePanel | null>(null);
  const [busy, setBusy] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const next = await fetchDevicePanel(houseId);
    setPanel(next);
  }, [houseId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function startInvite(role: DeviceRole) {
    setBusy(true);
    setInviteUrl(null);
    try {
      const created = await createDeviceInvite(houseId, role);
      const path = created.bindPath ?? `/access/bind?token=${encodeURIComponent(created.token ?? "")}&house=${encodeURIComponent(houseId)}`;
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setInviteUrl(`${origin}${path}`);
      toast.success("הזמנה נוצרה — פתחו את הקישור בטלפון השני");
      await reload();
      onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  async function cancelPending(pendingId: string) {
    setBusy(true);
    try {
      await cancelDeviceInvite(houseId, pendingId);
      toast.success("ההזמנה בוטלה");
      setInviteUrl(null);
      await reload();
      onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  if (!panel) return null;

  const atCapacity = panel.slotsUsed >= panel.slotsMax;

  return (
    <div className="mt-2 space-y-2 rounded-xl bg-[#14081c] p-3 text-right ring-1 ring-white/10" dir="rtl">
      <p className="text-sm text-violet-200">
        מכשירים {panel.slotsUsed}/{panel.slotsMax}
      </p>
      {panel.devices.map((device) => (
        <div key={device.id} className="flex items-center justify-between gap-2 text-sm text-orange-100">
          <span>
            {roleBadgeLabel(device.role)}
            {device.isSelf ? " · המכשיר הזה" : ""}
          </span>
        </div>
      ))}
      {panel.pending.map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-2 text-sm text-amber-200">
          <span>ממתין · {roleBadgeLabel(item.role)}</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-amber-100"
            disabled={busy}
            onClick={() => void cancelPending(item.id)}
          >
            ביטול
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          className="bg-orange-500 text-black hover:bg-orange-400"
          disabled={busy || atCapacity}
          onClick={() => void startInvite("visitor")}
        >
          הוספת מבקר
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-orange-500/40 text-orange-100"
          disabled={busy || atCapacity}
          onClick={() => void startInvite("editor")}
        >
          הוספת עורך
        </Button>
      </div>
      {atCapacity ? (
        <p className="text-xs text-violet-300">אין מקום — הסירו מכשיר קיים כדי להוסיף.</p>
      ) : null}
      {inviteUrl ? (
        <div className="space-y-2 pt-2">
          <p className="break-all text-xs text-orange-100">{inviteUrl}</p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="w-full"
            onClick={() => {
              void navigator.clipboard.writeText(inviteUrl).then(() => toast.success("הקישור הועתק"));
            }}
          >
            העתקת קישור
          </Button>
        </div>
      ) : null}
    </div>
  );
}
