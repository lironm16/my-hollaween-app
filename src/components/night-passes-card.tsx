"use client";

import { Copy, RotateCcw, Share2, Smartphone } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useNightPassDialogOptional } from "@/components/night-pass-dialog-provider";
import { Button } from "@/components/ui/button";
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
  const link = `${window.location.origin}/pass?c=${code.replace("-", "")}`;
  return `קוד כניסה לאירוע בשכונה: ${code}\nנרשמים כאן: ${link}\nהקוד עובד במכשיר אחד בלבד.`;
}

function formatWhen(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("he-IL", {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
      className="size-10 shrink-0 border-orange-500/25 bg-[#1d1028] text-orange-100 hover:bg-orange-500/15"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

/** Owner / admin: four event device codes — share, copy, reset when in use. */
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
      await navigator.clipboard.writeText(shareText(code));
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
        toast.error(
          res.status === 429 ? "לא ניתן יותר להשתמש בקוד זה" : (json?.error ?? "האיפוס נכשל."),
        );
        return;
      }
      toast.success("נוצר קוד חדש");
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
      <div className="space-y-1">
        {!embedded ? (
          <h2 className="text-center text-lg font-medium text-orange-200">4 מכשירים לאירוע</h2>
        ) : null}
        <p className="text-center text-sm leading-relaxed text-violet-200">
          שלחו קוד לכל מי שתרצו שיראה את כתובות הבתים ביום החשיפה — עד 4 מכשירים. רוצים
          לראות בעצמכם? השתמשו באחד הקודים בטלפון הזה. גם בלי כרטיס תמשיכו לראות ולעדכן את
          הבית שלכם.
        </p>
        {!data.enabled ? (
          <p className="text-center text-sm text-amber-200">כבוי לציבור — רק מנהלים רואים עכשיו.</p>
        ) : null}
      </div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <ul className="space-y-2">
        {data.slots.map((slot) => {
          const mine = data.thisDeviceSlot === slot.slot;
          const inUse = slot.status === "active";
          const canReset =
            inUse && (admin || (slot.resetsLeft != null && slot.resetsLeft > 0));
          const exhausted = inUse && !admin && slot.resetsLeft === 0;

          return (
            <li
              key={slot.slot}
              className="rounded-lg bg-[#12081a] p-3 ring-1 ring-orange-500/15"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-violet-300">מכשיר {slot.slot}</span>
                <span dir="ltr" className="font-mono text-base tracking-widest text-orange-100">
                  {slot.code}
                </span>
              </div>
              {inUse ? (
                <p className="mt-1.5 text-sm text-emerald-200">
                  {slot.holderName}
                  {slot.holderPhone ? (
                    <>
                      {" · "}
                      <bdi dir="ltr" className="inline-block text-emerald-300">
                        {slot.holderPhone}
                      </bdi>
                    </>
                  ) : null}
                  {mine ? <span className="text-orange-300"> · המכשיר הזה</span> : null}
                  {slot.registrations > 1 ? (
                    <span className="block text-xs text-violet-400">
                      עודכן · {formatWhen(slot.registeredAt)}
                    </span>
                  ) : null}
                </p>
              ) : (
                <p className="mt-1.5 text-sm text-violet-400">פנוי</p>
              )}
              {exhausted ? (
                <p className="mt-1.5 text-sm text-amber-200/90">לא ניתן יותר להשתמש בקוד זה</p>
              ) : null}
              <div className="mt-2 flex flex-wrap justify-end gap-1.5">
                <IconAction label="שליחה" onClick={() => void share(slot.code)}>
                  <Share2 className="size-5" strokeWidth={2} />
                </IconAction>
                <IconAction label="העתקה" onClick={() => void copy(slot.code)}>
                  <Copy className="size-5" strokeWidth={2} />
                </IconAction>
                {!inUse && !data.thisDeviceRegistered ? (
                  <IconAction
                    label="להשתמש בטלפון הזה"
                    onClick={() => passDialog?.openRegister(slot.code.replace("-", ""))}
                  >
                    <Smartphone className="size-5" strokeWidth={2} />
                  </IconAction>
                ) : null}
                {canReset ? (
                  <IconAction
                    label="איפוס — קוד חדש"
                    disabled={busySlot === slot.slot}
                    onClick={() => void resetSlot(slot)}
                  >
                    <RotateCcw
                      className={cn("size-5", busySlot === slot.slot && "animate-spin")}
                      strokeWidth={2}
                    />
                  </IconAction>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
