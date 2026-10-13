"use client";

import { Copy, KeyRound, Loader2, LogIn } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useNightPassDialogOptional } from "@/components/night-pass-dialog-provider";
import { Button } from "@/components/ui/button";
import {
  NIGHT_PASSES_SLOTS_CHANGED_EVENT,
  notifyNightPassSlotsChanged,
} from "@/lib/night-pass-client";
import { formatHouseAddedAt } from "@/lib/house-meta";

type SlotView = {
  slot: number;
  code: string;
  status: "unused" | "active";
  holderName: string | null;
  holderPhone: string | null;
  registeredAt: string | null;
  registrations: number;
  resetCount: number;
};

type PassesResponse = {
  enabled: boolean;
  slots: SlotView[];
  thisDeviceSlot: number | null;
  thisDeviceRegistered: boolean;
  error?: string;
};

function PassesSkeleton() {
  return (
    <ul className="divide-y divide-orange-500/15 overflow-hidden rounded-xl ring-1 ring-orange-500/20">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="space-y-3 px-3 py-4">
          <div className="mx-auto h-7 w-40 animate-pulse rounded-md bg-violet-950/80" />
          <div className="flex justify-center gap-2">
            <div className="h-9 w-16 animate-pulse rounded-lg bg-black/40" />
            <div className="h-9 w-16 animate-pulse rounded-lg bg-black/40" />
          </div>
          <div className="mx-auto h-5 w-24 animate-pulse rounded-md bg-emerald-950/50" />
        </li>
      ))}
    </ul>
  );
}

function SlotAction({
  label,
  onClick,
  disabled,
  icon,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon: ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={disabled}
      className="h-9 gap-1.5 border-orange-500/25 bg-[#1d1028] px-2.5 text-orange-100 hover:bg-orange-500/15"
      onClick={onClick}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </Button>
  );
}

/** Owner / admin: four event device codes. */
export function NightPassesCard({
  houseId,
  admin,
  embedded = false,
}: {
  houseId: string;
  admin: boolean;
  embedded?: boolean;
}) {
  const passDialog = useNightPassDialogOptional();
  const [data, setData] = useState<PassesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busySlot, setBusySlot] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(`/api/houses/${encodeURIComponent(houseId)}/night-passes`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as PassesResponse | null;
      if (!res.ok || !json) {
        setError(json?.error ?? "טעינת קודי הכניסה נכשלה.");
        setData(null);
        return;
      }
      setData(json);
    } catch {
      setError("טעינת קודי הכניסה נכשלה.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [houseId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const onChange = () => {
      setLoading(true);
      void load();
    };
    window.addEventListener(NIGHT_PASSES_SLOTS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(NIGHT_PASSES_SLOTS_CHANGED_EVENT, onChange);
  }, [load]);

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("קוד הכניסה הועתק");
    } catch {
      toast.message(code);
    }
  }

  function connectSlot(slot: SlotView, occupied: boolean) {
    if (occupied) {
      const who = slot.holderName ? `המכשיר של ${slot.holderName} יאבד גישה.\n\n` : "";
      if (
        !window.confirm(
          `${who}המכשיר הזה יתחבר עם קוד הכניסה הזה. להמשיך?`,
        )
      ) {
        return;
      }
    }
    passDialog?.openRegister(slot.code.replace("-", ""));
  }

  async function resetSlot(slot: SlotView) {
    const who = slot.holderName ? `המכשיר של ${slot.holderName} יאבד גישה.\n\n` : "";
    if (
      !window.confirm(
        `${who}ייווצר קוד כניסה חדש, וקוד הכניסה הנוכחי לא יהיה ניתן לשימוש. להמשיך?`,
      )
    ) {
      return;
    }
    setBusySlot(slot.slot);
    try {
      const res = await fetch(
        `/api/houses/${encodeURIComponent(houseId)}/night-passes/reset`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slot: slot.slot }),
        },
      );
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(json?.error ?? "האיפוס נכשל.");
        return;
      }
      toast.success("נוצר קוד כניסה חדש");
      notifyNightPassSlotsChanged();
      await load();
    } finally {
      setBusySlot(null);
    }
  }

  if (loading && !data) {
    return (
      <section className={embedded ? "space-y-3" : "mt-4 space-y-3"}>
        <PassesSkeleton />
      </section>
    );
  }

  if (!data) {
    return error ? <p className="text-sm text-red-300">{error}</p> : null;
  }
  if (!data.enabled && !admin) return null;

  const shellClass = embedded
    ? "space-y-3"
    : "mt-4 space-y-3 rounded-xl bg-[#1d1028] p-3 ring-1 ring-orange-500/20";

  return (
    <section className={shellClass}>
      {!embedded ? (
        <h2 className="text-center text-lg font-medium text-orange-200">4 מכשירים לאירוע</h2>
      ) : null}
      {!data.enabled ? (
        <p className="text-center text-sm text-amber-200">כבוי לציבור — רק מנהלים רואים עכשיו.</p>
      ) : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <ul className="divide-y divide-orange-500/15 overflow-hidden rounded-xl ring-1 ring-orange-500/20">
        {data.slots.map((slot) => {
          const mine = data.thisDeviceSlot === slot.slot;
          const inUse = slot.status === "active";
          const canReset = inUse;
          const resetting = busySlot === slot.slot;
          const showConnect = !mine && (inUse || !data.thisDeviceRegistered);

          return (
            <li key={slot.slot} className="flex flex-col items-center gap-3 px-3 py-4">
              <span dir="ltr" className="font-mono text-xl tracking-widest text-orange-100">
                {slot.code}
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <SlotAction
                  label="העתק"
                  onClick={() => void copy(slot.code)}
                  icon={<Copy className="size-4 shrink-0" strokeWidth={2.2} />}
                />
                {showConnect ? (
                  <SlotAction
                    label="חבר אותי"
                    onClick={() => connectSlot(slot, inUse)}
                    icon={<LogIn className="size-4 shrink-0" strokeWidth={2.2} />}
                  />
                ) : null}
                {canReset ? (
                  <SlotAction
                    label="קוד כניסה חדש"
                    disabled={resetting}
                    onClick={() => void resetSlot(slot)}
                    icon={
                      resetting ? (
                        <Loader2 className="size-4 shrink-0 animate-spin" strokeWidth={2.2} />
                      ) : (
                        <KeyRound className="size-4 shrink-0" strokeWidth={2.2} />
                      )
                    }
                  />
                ) : null}
              </div>
              {inUse ? (
                <p className="text-center text-base font-medium text-violet-200">
                  {slot.holderName}
                  {slot.holderPhone ? (
                    <>
                      {" · "}
                      <bdi dir="ltr" className="inline-block text-violet-300">
                        {slot.holderPhone}
                      </bdi>
                    </>
                  ) : null}
                  {mine ? <span className="text-orange-300"> · המכשיר הזה</span> : null}
                  {slot.registeredAt ? (
                    <span className="block text-sm font-normal text-violet-400">
                      עודכן · {formatHouseAddedAt(slot.registeredAt)}
                    </span>
                  ) : null}
                </p>
              ) : (
                <p className="text-center text-lg font-semibold text-emerald-400">פנוי</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
