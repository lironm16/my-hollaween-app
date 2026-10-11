"use client";

import { Copy, RotateCcw, Share2, Smartphone } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useNightPassDialogOptional } from "@/components/night-pass-dialog-provider";
import { Button } from "@/components/ui/button";
import {
  NIGHT_PASSES_SLOTS_CHANGED_EVENT,
  notifyNightPassSlotsChanged,
} from "@/lib/night-pass-client";
import { formatHouseAddedAt } from "@/lib/house-meta";
import { cn } from "@/lib/utils";

type SlotView = {
  slot: number;
  code: string;
  status: "unused" | "active";
  holderName: string | null;
  holderPhone: string | null;
  registeredAt: string | null;
  registrations: number;
  resetCount: number;
  resetsLeft: number | null;
};

type PassesResponse = {
  enabled: boolean;
  slots: SlotView[];
  thisDeviceSlot: number | null;
  thisDeviceRegistered: boolean;
  error?: string;
};

function shareText(code: string) {
  const plain = code.replace("-", "");
  const link = `${window.location.origin}/?openPass=1&c=${plain}`;
  return `קוד כניסה לאירוע בשכונה: ${code}\nנרשמים כאן: ${link}\nהקוד עובד במכשיר אחד בלבד.`;
}

function IconAction({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      disabled={disabled}
      aria-label={label}
      title={label}
      className="size-9 shrink-0 border-orange-500/25 bg-[#1d1028] text-orange-100 hover:bg-orange-500/15"
      onClick={onClick}
    >
      {children}
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
        setError(json?.error ?? "טעינת הקודים נכשלה.");
        return;
      }
      setData(json);
    } catch {
      setError("טעינת הקודים נכשלה.");
    }
  }, [houseId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onChange = () => void load();
    window.addEventListener(NIGHT_PASSES_SLOTS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(NIGHT_PASSES_SLOTS_CHANGED_EVENT, onChange);
  }, [load]);

  async function share(code: string) {
    const text = shareText(code);
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        /* fall through */
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("הקוד הועתק");
    } catch {
      toast.message(code);
    }
  }

  async function resetSlot(slot: SlotView) {
    const who = slot.holderName ? `המכשיר של ${slot.holderName} יאבד גישה.\n\n` : "";
    if (
      !window.confirm(
        `${who}ייווצר קוד חדש, והקוד הנוכחי לא יהיה ניתן לשימוש. להמשיך?`,
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
      toast.success("נוצר קוד חדש");
      notifyNightPassSlotsChanged();
      await load();
    } finally {
      setBusySlot(null);
    }
  }

  if (!data) return error && admin ? <p className="mt-4 text-sm text-red-300">{error}</p> : null;
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
          const canReset =
            inUse && (admin || (slot.resetsLeft != null && slot.resetsLeft > 0));

          return (
            <li key={slot.slot} className="flex flex-col items-center gap-2 px-3 py-3">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span dir="ltr" className="font-mono text-xl tracking-widest text-orange-100">
                  {slot.code}
                </span>
                <div className="flex items-center gap-1">
                  <IconAction label="שליחה" onClick={() => void share(slot.code)}>
                    <Share2 className="size-4" strokeWidth={2.2} />
                  </IconAction>
                  <IconAction label="העתקה" onClick={() => void copy(slot.code)}>
                    <Copy className="size-4" strokeWidth={2.2} />
                  </IconAction>
                  {!inUse && !data.thisDeviceRegistered ? (
                    <IconAction
                      label="להשתמש בטלפון הזה"
                      onClick={() => passDialog?.openRegister(slot.code.replace("-", ""))}
                    >
                      <Smartphone className="size-4" strokeWidth={2.2} />
                    </IconAction>
                  ) : null}
                  {canReset ? (
                    <IconAction
                      label="איפוס — קוד חדש"
                      disabled={busySlot === slot.slot}
                      onClick={() => void resetSlot(slot)}
                    >
                      <RotateCcw
                        className={cn("size-4", busySlot === slot.slot && "animate-spin")}
                        strokeWidth={2.2}
                      />
                    </IconAction>
                  ) : null}
                </div>
              </div>
              {inUse ? (
                <p className="text-center text-lg font-medium text-violet-200">
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
